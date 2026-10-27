import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { formatDateOnly } from '../utils/dates.js';

let transporter = null;
const smtpConfigured = () => Boolean(env.smtp.host);

function getTransporter() {
  if (!transporter && smtpConfigured()) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const layout = (title, body) => `
  <div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#0f1d3a">
    <h1 style="font-size:22px;border-bottom:2px solid #c9a227;padding-bottom:8px">${escapeHtml(env.hotel.name)}</h1>
    <h2 style="font-size:18px">${escapeHtml(title)}</h2>
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${body}</div>
  </div>`;

// Email is best-effort: failures are logged and never break the request.
export async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) {
    if (env.isProd) logger.warn(`Email not sent (SMTP not configured): "${subject}"`);
    else if (!env.isTest) logger.info(`[dev email] To: ${to}\nSubject: ${subject}\n${text}`);
    return { delivered: false };
  }
  try {
    await transport.sendMail({ from: env.smtp.from, to, subject, html, text });
    return { delivered: true };
  } catch (err) {
    logger.error(`Email delivery failed for "${subject}": ${err.message}`);
    return { delivered: false };
  }
}

export function sendPasswordResetEmail(user, resetUrl) {
  return sendEmail({
    to: user.email,
    subject: `Reset your ${env.hotel.name} password`,
    text: `Hi ${user.name},\n\nUse this link to reset your password. It expires in ${env.resetTokenTtlMinutes} minutes:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: layout(
      'Reset your password',
      `<p>Hi ${escapeHtml(user.name)},</p>
       <p>Use the button below to reset your password. The link expires in ${env.resetTokenTtlMinutes} minutes.</p>
       <p><a href="${escapeHtml(resetUrl)}" style="background:#0f1d3a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Reset password</a></p>
       <p>If you did not request this, you can ignore this email.</p>`,
    ),
  });
}

const bookingSummary = (b) =>
  `Reference: ${b.reference}\nRoom: ${b.roomSnapshot?.name} x ${b.rooms}\nCheck-in: ${formatDateOnly(b.checkIn)}\nCheck-out: ${formatDateOnly(b.checkOut)}\nGuests: ${b.adults} adult(s), ${b.children} child(ren)\nTotal: ${b.pricing.currency} ${b.pricing.total.toFixed(2)}`;

export function sendBookingConfirmedEmail(booking) {
  const summary = bookingSummary(booking);
  return sendEmail({
    to: booking.guest.email,
    subject: `Booking confirmed: ${booking.reference}`,
    text: `Dear ${booking.guest.firstName},\n\nYour stay is confirmed.\n\n${summary}\n\nWe look forward to welcoming you.`,
    html: layout('Your stay is confirmed', `<p>Dear ${escapeHtml(booking.guest.firstName)},</p><pre style="font-family:inherit">${escapeHtml(summary)}</pre><p>We look forward to welcoming you.</p>`),
  });
}

export function sendBookingCancelledEmail(booking) {
  const refund = booking.cancellation?.refundAmount
    ? `\nRefund: ${booking.pricing.currency} ${booking.cancellation.refundAmount.toFixed(2)}`
    : '';
  const summary = `${bookingSummary(booking)}${refund}`;
  return sendEmail({
    to: booking.guest.email,
    subject: `Booking cancelled: ${booking.reference}`,
    text: `Dear ${booking.guest.firstName},\n\nYour booking has been cancelled.\n\n${summary}`,
    html: layout('Your booking was cancelled', `<p>Dear ${escapeHtml(booking.guest.firstName)},</p><pre style="font-family:inherit">${escapeHtml(summary)}</pre>`),
  });
}

export function sendContactNotification(message) {
  if (!env.smtp.adminNotifyEmail) return Promise.resolve({ delivered: false });
  return sendEmail({
    to: env.smtp.adminNotifyEmail,
    subject: `New enquiry: ${message.subject}`,
    text: `From: ${message.name} <${message.email}> ${message.phone || ''}\n\n${message.message}`,
    html: layout('New website enquiry', `<p><strong>${escapeHtml(message.name)}</strong> &lt;${escapeHtml(message.email)}&gt; ${escapeHtml(message.phone || '')}</p><p>${escapeHtml(message.message)}</p>`),
  });
}
