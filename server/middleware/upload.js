import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_UPLOAD = 8;

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES_PER_UPLOAD },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
      return cb(ApiError.badRequest('Only JPEG, PNG and WebP images are allowed', { code: 'INVALID_FILE_TYPE' }));
    }
    return cb(null, true);
  },
}).array('images', MAX_IMAGES_PER_UPLOAD);

// The declared mimetype comes from the client, so check the file's magic bytes too.
export function detectImageType(buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
