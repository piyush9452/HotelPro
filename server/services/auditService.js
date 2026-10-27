import { AuditLog } from '../models/AuditLog.js';
import { clientIp } from '../utils/http.js';
import { logger } from '../utils/logger.js';

// Callers must never pass passwords, tokens or payment secrets in `details`.
export async function recordAudit(req, { action, entityType, entityId, details }) {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      actorRole: req.user?.role || 'system',
      action,
      entityType,
      entityId,
      details,
      ip: req ? clientIp(req) : undefined,
    });
  } catch (err) {
    logger.error(`Failed to write audit log for ${action}: ${err.message}`);
  }
}
