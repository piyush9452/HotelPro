import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ALLOWED_IMAGE_TYPES, detectImageType } from '../middleware/upload.js';
import { logger } from '../utils/logger.js';

export const UPLOADS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
const LOCAL_PREFIX = 'local:';
const LOCAL_NAME_RE = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

const cloudinaryConfigured = () =>
  Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

let cloudinaryClient = null;
async function getCloudinary() {
  if (!cloudinaryClient) {
    const { v2 } = await import('cloudinary');
    v2.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
    cloudinaryClient = v2;
  }
  return cloudinaryClient;
}

export async function storeImage(file) {
  const detected = detectImageType(file.buffer);
  if (!detected || detected !== file.mimetype) {
    throw ApiError.badRequest(`"${file.originalname}" is not a valid JPEG, PNG or WebP image`, { code: 'INVALID_FILE_TYPE' });
  }

  if (cloudinaryConfigured()) {
    const cloudinary = await getCloudinary();
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: env.cloudinary.folder, resource_type: 'image' }, (err, res) => (err ? reject(err) : resolve(res)))
        .end(file.buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  // Development fallback: store on local disk and serve from /uploads.
  const filename = `${crypto.randomUUID()}.${ALLOWED_IMAGE_TYPES[detected]}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, filename), file.buffer);
  return { url: `${env.publicServerUrl}/uploads/${filename}`, publicId: `${LOCAL_PREFIX}${filename}` };
}

export async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    if (publicId.startsWith(LOCAL_PREFIX)) {
      const filename = publicId.slice(LOCAL_PREFIX.length);
      if (LOCAL_NAME_RE.test(filename)) await fs.unlink(path.join(UPLOADS_DIR, filename));
    } else if (cloudinaryConfigured()) {
      const cloudinary = await getCloudinary();
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (err) {
    logger.warn(`Could not delete image ${publicId}: ${err.message}`);
  }
}
