import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler, sendSuccess } from '../utils/http.js';
import { clearAuthCookie, issueAuthCookie } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-password', 4);
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (await User.exists({ email })) {
    throw ApiError.conflict('An account with this email already exists', { code: 'EMAIL_IN_USE' });
  }
  // Role is never taken from the request.
  const user = await User.create({ name, email, phone, password, role: 'user' });
  issueAuthCookie(res, user);
  sendSuccess(res, { status: 201, data: { user }, message: 'Welcome to HotelPro! Your account has been created.' });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +tokenVersion');
  const valid = await bcrypt.compare(password, user?.password || DUMMY_HASH);
  if (!user || !valid) throw ApiError.unauthorized('Invalid email or password', { code: 'INVALID_CREDENTIALS' });
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Please contact support.', { code: 'ACCOUNT_DISABLED' });
  }
  user.lastLoginAt = new Date();
  await user.save();
  issueAuthCookie(res, user);
  sendSuccess(res, { data: { user }, message: `Welcome back, ${user.name.split(' ')[0]}!` });
});

export const logout = (_req, res) => {
  clearAuthCookie(res);
  sendSuccess(res, { message: 'You have been signed out' });
};

export const me = (req, res) => sendSuccess(res, { data: { user: req.user } });

// Used by the client on start-up: 200 with user=null for anonymous visitors.
export const session = (req, res) => sendSuccess(res, { data: { user: req.user || null } });

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  await user.save();
  sendSuccess(res, { data: { user }, message: 'Profile updated' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password +tokenVersion');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect', { code: 'INVALID_PASSWORD' });
  }
  user.password = req.body.newPassword;
  await user.save();
  issueAuthCookie(res, user);
  sendSuccess(res, { message: 'Password changed successfully' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email, isActive: true });
  if (user) {
    await PasswordResetToken.deleteMany({ user: user._id });
    const token = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({
      user: user._id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + env.resetTokenTtlMinutes * 60 * 1000),
    });
    const resetUrl = `${env.clientUrls[0]}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user, resetUrl);
  }
  // Same response either way, so the endpoint can't be used to discover accounts.
  sendSuccess(res, { message: 'If an account exists for that email, a password reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const record = await PasswordResetToken.findOne({ tokenHash: hashToken(req.body.token), expiresAt: { $gt: new Date() } });
  if (!record) throw ApiError.badRequest('This reset link is invalid or has expired', { code: 'INVALID_RESET_TOKEN' });

  const user = await User.findById(record.user).select('+tokenVersion');
  if (!user || !user.isActive) throw ApiError.badRequest('This reset link is invalid or has expired', { code: 'INVALID_RESET_TOKEN' });

  user.password = req.body.password;
  await user.save();
  await PasswordResetToken.deleteMany({ user: user._id });
  clearAuthCookie(res);
  sendSuccess(res, { message: 'Your password has been reset. Please sign in with your new password.' });
});
