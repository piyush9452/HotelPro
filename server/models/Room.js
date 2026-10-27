import mongoose from 'mongoose';

export const ROOM_CATEGORIES = ['standard', 'deluxe', 'executive', 'suite', 'family'];
export const BED_TYPES = ['king', 'queen', 'double', 'twin', 'single'];
export const AMENITIES = [
  'Free Wi-Fi',
  'Air Conditioning',
  'Smart TV',
  'Mini Bar',
  'Room Service',
  'Coffee Maker',
  'Work Desk',
  'In-room Safe',
  'Bathtub',
  'Rain Shower',
  'Balcony',
  'City View',
  'Sea View',
  'Garden View',
  'Lounge Access',
  'Kitchenette',
  'Breakfast Included',
  'Jacuzzi',
  'Soundproofing',
  'Wheelchair Accessible',
];

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    publicId: { type: String, trim: true, maxlength: 300 },
    alt: { type: String, trim: true, maxlength: 200 },
  },
  { _id: true },
);

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    roomNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 20 },
    category: { type: String, required: true, enum: ROOM_CATEGORIES, index: true },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 3000 },
    pricePerNight: { type: Number, required: true, min: 1, max: 1000000 },
    maxAdults: { type: Number, required: true, min: 1, max: 10 },
    maxChildren: { type: Number, required: true, min: 0, max: 10 },
    bedType: { type: String, required: true, enum: BED_TYPES },
    beds: { type: Number, required: true, min: 1, max: 10 },
    size: { type: Number, min: 0, max: 20000 },
    view: { type: String, trim: true, maxlength: 60 },
    amenities: { type: [String], default: [] },
    images: { type: [imageSchema], default: [] },
    // Number of identical, bookable units of this room type.
    inventory: { type: Number, required: true, min: 1, max: 500 },
    isActive: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false },
    popularity: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

roomSchema.index({ isActive: 1, category: 1, pricePerNight: 1 });
roomSchema.index({ name: 'text', description: 'text' });

export const Room = mongoose.model('Room', roomSchema);
