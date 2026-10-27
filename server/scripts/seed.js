/* eslint-disable no-console */
// Seeds the room catalogue and an admin account.
//   npm run seed            create/update rooms and the admin (idempotent)
//   npm run seed -- --rooms-only
//
// Admin credentials come from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD. In
// development a random password is generated and printed if none is set.
// In production a strong password must be supplied explicitly.
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';

const img = (id, alt) => ({ url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`, alt });

const ROOMS = [
  {
    name: 'Classic Garden Room',
    roomNumber: 'STD-101',
    category: 'standard',
    description:
      'A calm, light-filled retreat overlooking our landscaped courtyard gardens. Thoughtfully designed with a plush queen bed, a dedicated work desk and a rain shower, it is ideal for solo travellers and couples who want comfort without compromise.',
    pricePerNight: 4500,
    maxAdults: 2,
    maxChildren: 1,
    bedType: 'queen',
    beds: 1,
    size: 280,
    view: 'Garden',
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Coffee Maker', 'Work Desk', 'Rain Shower', 'Garden View'],
    inventory: 12,
    featured: false,
    popularity: 42,
    images: [img('1611892440504-42a792e24d32', 'Classic Garden Room bed'), img('1505693416388-ac5ce068fe85', 'Bedroom detail'), img('1584622650111-993a426fbf0a', 'Bathroom')],
  },
  {
    name: 'Twin Comfort Room',
    roomNumber: 'STD-201',
    category: 'standard',
    description:
      'Two generous single beds, blackout drapes and a quiet, soundproofed layout make this the favourite of friends and colleagues travelling together. Includes a work desk, in-room safe and complimentary high-speed Wi-Fi.',
    pricePerNight: 4800,
    maxAdults: 2,
    maxChildren: 0,
    bedType: 'twin',
    beds: 2,
    size: 300,
    view: 'City',
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Work Desk', 'In-room Safe', 'Soundproofing', 'City View'],
    inventory: 10,
    popularity: 25,
    images: [img('1595576508898-0ad5c879a061', 'Twin Comfort Room'), img('1540518614846-7eded433c457', 'Room interior')],
  },
  {
    name: 'Deluxe City View King',
    roomNumber: 'DLX-301',
    category: 'deluxe',
    description:
      'Floor-to-ceiling windows frame the skyline in this elegant deluxe room. A sumptuous king bed with premium linens, a marble bathroom with a deep soaking tub and a curated mini bar create an effortlessly refined stay.',
    pricePerNight: 7200,
    maxAdults: 2,
    maxChildren: 1,
    bedType: 'king',
    beds: 1,
    size: 380,
    view: 'City',
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Mini Bar', 'Room Service', 'Coffee Maker', 'Bathtub', 'City View', 'In-room Safe'],
    inventory: 8,
    featured: true,
    popularity: 88,
    images: [img('1590490360182-c33d57733427', 'Deluxe City View King'), img('1618773928121-c32242e63f39', 'Deluxe bedroom'), img('1584132967334-10e028bd69f7', 'Sun deck overlooking the water')],
  },
  {
    name: 'Deluxe Balcony Room',
    roomNumber: 'DLX-302',
    category: 'deluxe',
    description:
      'Step out onto a private furnished balcony with your morning coffee. This deluxe room pairs a king bed and contemporary décor with a spacious bathroom, rain shower and complimentary breakfast for two.',
    pricePerNight: 7900,
    maxAdults: 2,
    maxChildren: 2,
    bedType: 'king',
    beds: 1,
    size: 410,
    view: 'Garden',
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Mini Bar', 'Balcony', 'Rain Shower', 'Breakfast Included', 'Garden View'],
    inventory: 6,
    featured: true,
    popularity: 64,
    images: [img('1582719478250-c89cae4dc85b', 'Deluxe Balcony Room'), img('1631049307264-da0ec9d70304', 'Room with balcony'), img('1596394516093-501ba68a0ba6', 'Bedroom view')],
  },
  {
    name: 'Executive Club Room',
    roomNumber: 'EXE-501',
    category: 'executive',
    description:
      'Designed for the discerning business traveller, with exclusive Executive Lounge access, evening cocktails, a large ergonomic workspace and express check-in. Unwind in a king bed with panoramic city views after a productive day.',
    pricePerNight: 10500,
    maxAdults: 2,
    maxChildren: 1,
    bedType: 'king',
    beds: 1,
    size: 450,
    view: 'City',
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Mini Bar', 'Room Service', 'Coffee Maker', 'Work Desk', 'Lounge Access', 'Breakfast Included', 'City View', 'Soundproofing'],
    inventory: 5,
    featured: true,
    popularity: 51,
    images: [img('1631049307264-da0ec9d70304', 'Executive Club Room'), img('1560185007-cde436f6a4d0', 'Executive seating area'), img('1560185127-6ed189bf02f4', 'Executive bedroom')],
  },
  {
    name: 'Family Garden Suite',
    roomNumber: 'FAM-601',
    category: 'family',
    description:
      'Room for everyone: a king bed for the grown-ups, two twin beds for the little ones and a separate lounge with a kitchenette. Opens onto the garden with direct access to the pool and children’s play area.',
    pricePerNight: 12500,
    maxAdults: 4,
    maxChildren: 3,
    bedType: 'king',
    beds: 3,
    size: 720,
    view: 'Garden',
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Mini Bar', 'Kitchenette', 'Coffee Maker', 'Bathtub', 'Garden View', 'Breakfast Included', 'Wheelchair Accessible'],
    inventory: 4,
    popularity: 37,
    images: [img('1576675784201-0e142b423952', 'Family Garden Suite'), img('1522771739844-6a9f6d5f14af', 'Children’s bedroom'), img('1600011689032-8b628b8a8747', 'Family lounge')],
  },
  {
    name: 'Ocean Panorama Suite',
    roomNumber: 'STE-801',
    category: 'suite',
    description:
      'Our signature suite: a separate living and dining room, a wraparound balcony with uninterrupted sea views and a spa-style bathroom with a private jacuzzi. Butler service and Executive Lounge access are included.',
    pricePerNight: 22000,
    maxAdults: 3,
    maxChildren: 2,
    bedType: 'king',
    beds: 1,
    size: 980,
    view: 'Sea',
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Mini Bar', 'Room Service', 'Coffee Maker', 'Bathtub', 'Jacuzzi', 'Balcony', 'Sea View', 'Lounge Access', 'Breakfast Included', 'In-room Safe'],
    inventory: 3,
    featured: true,
    popularity: 73,
    images: [img('1578683010236-d716f9a3f461', 'Ocean Panorama Suite'), img('1591088398332-8a7791972843', 'Suite living room'), img('1629140727571-9b5c6f6267b4', 'Suite bathroom')],
  },
  {
    name: 'Presidential Penthouse',
    roomNumber: 'STE-901',
    category: 'suite',
    description:
      'The pinnacle of HotelPro hospitality. Spanning the entire top floor, the penthouse features two bedrooms, a grand piano lounge, a private terrace with plunge pool, a dedicated butler and chauffeured airport transfers.',
    pricePerNight: 48000,
    maxAdults: 4,
    maxChildren: 2,
    bedType: 'king',
    beds: 2,
    size: 2200,
    view: 'Sea',
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Mini Bar', 'Room Service', 'Coffee Maker', 'Work Desk', 'In-room Safe', 'Bathtub', 'Jacuzzi', 'Balcony', 'Sea View', 'Lounge Access', 'Kitchenette', 'Breakfast Included', 'Soundproofing'],
    inventory: 1,
    featured: true,
    popularity: 19,
    images: [img('1587985064135-0366536eab42', 'Presidential Penthouse'), img('1615460549969-36fa19521a4f', 'Penthouse bedroom'), img('1591088398332-8a7791972843', 'Penthouse lounge')],
  },
];

async function seedRooms() {
  for (const room of ROOMS) {
    await Room.updateOne({ roomNumber: room.roomNumber }, { $set: room }, { upsert: true, runValidators: true });
  }
  console.log(`✓ ${ROOMS.length} room types seeded`);
}

const strongPassword = (p) => p.length >= 12 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p);

async function seedAdmin() {
  const email = (env.seedAdmin.email || (env.isProd ? '' : 'admin@hotelpro.local')).toLowerCase();
  let password = env.seedAdmin.password;
  let generated = false;

  if (!email) throw new Error('SEED_ADMIN_EMAIL is required in production');
  if (!password) {
    if (env.isProd) throw new Error('SEED_ADMIN_PASSWORD is required in production');
    password = `Hp-${crypto.randomBytes(9).toString('base64url')}9a`;
    generated = true;
  }
  if (env.isProd && (!strongPassword(password) || /changeme/i.test(password))) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters with upper, lower case and a number, and not an example value');
  }

  const existing = await User.findOne({ email }).select('+password +tokenVersion');
  if (existing) {
    existing.role = 'admin';
    existing.isActive = true;
    if (env.seedAdmin.password) existing.password = password;
    await existing.save();
    console.log(`✓ Admin account ensured: ${email}${env.seedAdmin.password ? ' (password updated from SEED_ADMIN_PASSWORD)' : ' (password unchanged)'}`);
    return;
  }
  await User.create({ name: env.seedAdmin.name, email, phone: env.seedAdmin.phone, password, role: 'admin' });
  console.log(`✓ Admin account created: ${email}`);
  if (generated) console.log(`  Generated development password: ${password}\n  (set SEED_ADMIN_PASSWORD in server/.env to choose your own)`);
}

async function main() {
  await connectDB();
  await seedRooms();
  if (!process.argv.includes('--rooms-only')) await seedAdmin();
  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error(`✗ Seed failed: ${err.message}`);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
