import { Router } from 'express';
import { z } from 'zod';
import * as admin from '../controllers/adminController.js';
import * as rooms from '../controllers/roomController.js';
import * as contact from '../controllers/contactController.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams, pagination } from '../validators/common.js';
import { adminBookingsQuery, adminStatusSchema } from '../validators/booking.js';
import { adminListRoomsQuery } from '../validators/room.js';
import {
  adminUsersQuery,
  auditLogsQuery,
  contactListQuery,
  contactStatusSchema,
  reportsQuery,
  userStatusSchema,
} from '../validators/misc.js';

const router = Router();
router.use(requireAdmin);

router.get('/dashboard', admin.dashboard);
router.get('/reports', validate({ query: reportsQuery }), admin.reports);

router.get('/users', validate({ query: adminUsersQuery }), admin.listUsers);
router.get('/users/:id', validate({ params: idParams }), admin.getUser);
router.patch('/users/:id/status', validate({ params: idParams, body: userStatusSchema }), admin.updateUserStatus);

router.get('/bookings', validate({ query: adminBookingsQuery }), admin.listBookings);
router.get('/bookings/:id', validate({ params: idParams }), admin.getBookingAdmin);
router.patch('/bookings/:id/status', validate({ params: idParams, body: adminStatusSchema }), admin.updateBookingStatus);

router.get('/rooms', validate({ query: adminListRoomsQuery }), rooms.adminListRooms);
router.get('/rooms/:id', validate({ params: idParams }), rooms.adminGetRoom);
router.get('/rooms/:id/bookings', validate({ params: idParams, query: z.object(pagination) }), rooms.roomBookings);

router.get('/audit-logs', validate({ query: auditLogsQuery }), admin.auditLogs);

router.get('/messages', validate({ query: contactListQuery }), contact.listMessages);
router.patch('/messages/:id', validate({ params: idParams, body: contactStatusSchema }), contact.updateMessageStatus);

export default router;
