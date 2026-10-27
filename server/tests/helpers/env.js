// Must be imported before anything that reads config/env.js.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-0123456789';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.RAZORPAY_KEY_ID = '';
process.env.RAZORPAY_KEY_SECRET = '';
process.env.SMTP_HOST = '';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.HOTEL_TIMEZONE = 'Asia/Kolkata';
