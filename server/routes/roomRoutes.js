import { Router } from 'express';
import * as rooms from '../controllers/roomController.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { imageUpload } from '../middleware/upload.js';
import { idParams } from '../validators/common.js';
import {
  availabilityQuery,
  createRoomSchema,
  deleteRoomQuery,
  imageParams,
  listRoomsQuery,
  updateRoomSchema,
} from '../validators/room.js';

const router = Router();

// Static paths must be registered before "/:id".
router.get('/', validate({ query: listRoomsQuery }), rooms.listRooms);
router.get('/meta', rooms.roomMeta);
router.get('/availability', validate({ query: availabilityQuery }), rooms.checkAvailability);
router.get('/:id', validate({ params: idParams }), rooms.getRoom);

router.post('/', requireAdmin, validate({ body: createRoomSchema }), rooms.createRoom);
router.patch('/:id', requireAdmin, validate({ params: idParams, body: updateRoomSchema }), rooms.updateRoom);
router.delete('/:id', requireAdmin, validate({ params: idParams, query: deleteRoomQuery }), rooms.deleteRoom);
router.post('/:id/images', requireAdmin, validate({ params: idParams }), imageUpload, rooms.uploadRoomImages);
router.delete('/:id/images/:imageId', requireAdmin, validate({ params: imageParams }), rooms.deleteRoomImage);

export default router;
