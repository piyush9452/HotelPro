import { Router } from 'express';
import * as payments from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { paymentLimiter } from '../middleware/rateLimit.js';
import { createOrderSchema, mockCheckoutSchema, paymentFailureSchema, verifyPaymentSchema } from '../validators/misc.js';

// The webhook route is mounted separately in app.js because it needs the raw body.
const router = Router();

router.get('/config', payments.paymentConfig);
router.use(authenticate, paymentLimiter);
router.post('/create-order', validate({ body: createOrderSchema }), payments.createPaymentOrder);
router.post('/verify', validate({ body: verifyPaymentSchema }), payments.verify);
router.post('/failure', validate({ body: paymentFailureSchema }), payments.reportFailure);
router.post('/mock/checkout', validate({ body: mockCheckoutSchema }), payments.mockCheckout);

export default router;
