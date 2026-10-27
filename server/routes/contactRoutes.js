import { Router } from 'express';
import { submitContact } from '../controllers/contactController.js';
import { validate } from '../middleware/validate.js';
import { contactLimiter } from '../middleware/rateLimit.js';
import { contactSchema } from '../validators/misc.js';

const router = Router();

router.post('/', contactLimiter, validate({ body: contactSchema }), submitContact);

export default router;
