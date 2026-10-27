import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { dbStatus } from './config/db.js';
import { csrfProtection, issueCsrfToken } from './middleware/csrf.js';
import { sanitizeRequest } from './middleware/sanitize.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/error.js';
import { webhook } from './controllers/paymentController.js';
import { UPLOADS_DIR } from './services/uploadService.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', env.trustProxy);

  app.use(
    helmet({
      // Allow the separately hosted frontend to display uploaded room images.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin and non-browser clients (curl, Postman, webhooks) send no Origin.
        if (!origin || env.clientUrls.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      exposedHeaders: ['Content-Disposition'],
      maxAge: 600,
    }),
  );
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Webhooks are authenticated by HMAC over the raw body, not by cookies, so
  // they are registered before the JSON parser and outside CSRF protection.
  app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), webhook);

  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(sanitizeRequest);
  app.use('/api', apiLimiter);

  app.get('/api/health', (_req, res) => {
    const db = dbStatus();
    res.status(db === 'connected' ? 200 : 503).json({
      success: db === 'connected',
      data: { status: db === 'connected' ? 'ok' : 'degraded', database: db, uptime: Math.round(process.uptime()), env: env.nodeEnv },
    });
  });
  app.get('/api/csrf-token', issueCsrfToken);

  app.use('/api', csrfProtection);
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/contact', contactRoutes);

  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', index: false, dotfiles: 'deny' }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
