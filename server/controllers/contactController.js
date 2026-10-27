import { ContactMessage } from '../models/ContactMessage.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler, escapeRegex, paginationMeta, sendSuccess } from '../utils/http.js';
import { sendContactNotification } from '../services/emailService.js';
import { recordAudit } from '../services/auditService.js';

export const submitContact = asyncHandler(async (req, res) => {
  const message = await ContactMessage.create(req.body);
  sendContactNotification(message).catch(() => {});
  sendSuccess(res, { status: 201, message: 'Thank you! Our team will get back to you within 24 hours.' });
});

export const listMessages = asyncHandler(async (req, res) => {
  const { page, limit, status, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { subject: rx }];
  }
  const [messages, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ContactMessage.countDocuments(filter),
  ]);
  sendSuccess(res, { data: messages, meta: paginationMeta(page, limit, total) });
});

export const updateMessageStatus = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!message) throw ApiError.notFound('Message not found');
  await recordAudit(req, { action: 'contact.status', entityType: 'ContactMessage', entityId: message._id, details: { status: req.body.status } });
  sendSuccess(res, { data: message, message: 'Message updated' });
});
