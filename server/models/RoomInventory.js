import mongoose from 'mongoose';

// One document per room type per night: how many units are held by pending or
// confirmed bookings. Conditional atomic $inc on these documents is what
// prevents overbooking without requiring a replica set.
const roomInventorySchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    date: { type: Date, required: true },
    booked: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

roomInventorySchema.index({ room: 1, date: 1 }, { unique: true });
roomInventorySchema.index({ date: 1 });

export const RoomInventory = mongoose.model('RoomInventory', roomInventorySchema);
