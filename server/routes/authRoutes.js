import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter, passwordResetLimiter, registerLimiter } from '../middleware/rateLimit.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validators/auth.js';

const router = Router();

router.post('/register', registerLimiter, validate({ body: registerSchema }), auth.register);
router.post('/login', loginLimiter, validate({ body: loginSchema }), auth.login);
router.post('/logout', auth.logout);
router.get('/me', authenticate, auth.me);
router.get('/session', optionalAuth, auth.session);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), auth.updateProfile);
router.post('/change-password', authenticate, loginLimiter, validate({ body: changePasswordSchema }), auth.changePassword);
router.post('/forgot-password', passwordResetLimiter, validate({ body: forgotPasswordSchema }), auth.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate({ body: resetPasswordSchema }), auth.resetPassword);

export default router;
