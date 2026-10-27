import { Router } from 'express';
import * as bookings from '../controllers/bookingController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { cancelBookingSchema, createBookingSchema, myBookingsQuery } from '../validators/booking.js';

const router = Router();

router.use(authenticate);
router.post('/', validate({ body: createBookingSchema }), bookings.create);
router.get('/my', validate({ query: myBookingsQuery }), bookings.myBookings);
router.get('/:id', validate({ params: idParams }), bookings.getBooking);
router.post('/:id/cancel', validate({ params: idParams, body: cancelBookingSchema }), bookings.cancel);

export default router;
