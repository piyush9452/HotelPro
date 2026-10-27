import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const num = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const bool = (value, fallback) => (value === undefined || value === '' ? fallback : value === 'true');

const DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret-do-not-use-in-production-0123456789';

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const razorpayEnabled = Boolean(razorpayKeyId && razorpayKeySecret);

export const env = {
  nodeEnv,
  isProd,
  isTest,
  port: num(process.env.PORT, 8001),
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotelpro',
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : DEV_JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  cookieName: process.env.COOKIE_NAME || 'hotelpro_token',
  csrfCookieName: process.env.CSRF_COOKIE_NAME || 'hotelpro_csrf',
  // Cross-site deployments (e.g. Vercel frontend + Render API) need SameSite=None; Secure.
  cookieSameSite: process.env.COOKIE_SAMESITE || (isProd ? 'none' : 'lax'),
  cookieSecure: bool(process.env.COOKIE_SECURE, isProd),
  trustProxy: num(process.env.TRUST_PROXY, isProd ? 1 : 0),
  bcryptRounds: num(process.env.BCRYPT_ROUNDS, isTest ? 4 : 12),
  resetTokenTtlMinutes: num(process.env.RESET_TOKEN_TTL_MINUTES, 30),
  hotel: {
    name: process.env.HOTEL_NAME || 'HotelPro',
    timezone: process.env.HOTEL_TIMEZONE || 'Asia/Kolkata',
    currency: process.env.HOTEL_CURRENCY || 'INR',
    taxRate: num(process.env.TAX_RATE, 0.12),
    serviceFeeRate: num(process.env.SERVICE_FEE_RATE, 0.03),
    freeCancellationHours: num(process.env.FREE_CANCELLATION_HOURS, 48),
    checkInHour: num(process.env.CHECK_IN_HOUR, 14),
    pendingBookingTtlMinutes: num(process.env.PENDING_BOOKING_TTL_MINUTES, 15),
    maxNights: num(process.env.MAX_NIGHTS, 30),
    maxRoomsPerBooking: num(process.env.MAX_ROOMS_PER_BOOKING, 5),
    bookingWindowDays: num(process.env.BOOKING_WINDOW_DAYS, 365),
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'HotelPro <no-reply@hotelpro.local>',
    adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'hotelpro',
  },
  publicServerUrl: (process.env.SERVER_PUBLIC_URL || `http://localhost:${num(process.env.PORT, 8001)}`).replace(/\/$/, ''),
  razorpay: {
    enabled: razorpayEnabled,
    keyId: razorpayKeyId,
    keySecret: razorpayKeySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  // The mock gateway exists only for local development without Razorpay credentials.
  mockPaymentsEnabled: !isProd && !razorpayEnabled && bool(process.env.ENABLE_MOCK_PAYMENTS, true),
  mockPaymentSecret: process.env.MOCK_PAYMENT_SECRET || 'dev-only-mock-payment-secret',
  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME || 'HotelPro Admin',
    email: process.env.SEED_ADMIN_EMAIL || '',
    password: process.env.SEED_ADMIN_PASSWORD || '',
    phone: process.env.SEED_ADMIN_PHONE || '9000000000',
  },
};

export function assertProductionConfig() {
  if (!env.isProd) return;
  const problems = [];
  if (!env.jwtSecret || env.jwtSecret.length < 32 || env.jwtSecret.startsWith('replace_with')) {
    problems.push('JWT_SECRET must be set to a random value of at least 32 characters');
  }
  if (!process.env.MONGO_URI) problems.push('MONGO_URI must be set');
  if (!process.env.CLIENT_URL) problems.push('CLIENT_URL must be set');
  if (problems.length) {
    throw new Error(`Invalid production configuration:\n - ${problems.join('\n - ')}`);
  }
}
