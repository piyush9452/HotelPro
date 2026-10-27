import {
  Accessibility, Bath, BedDouble, Building2, Coffee, ConciergeBell, Droplets, Lock, Monitor, Mountain, Sofa,
  Snowflake, Sparkles, Trees, Tv, UtensilsCrossed, VolumeX, Waves, Wifi, Wine, Check,
} from 'lucide-react';

export const AMENITY_ICONS = {
  'Free Wi-Fi': Wifi,
  'Air Conditioning': Snowflake,
  'Smart TV': Tv,
  'Mini Bar': Wine,
  'Room Service': ConciergeBell,
  'Coffee Maker': Coffee,
  'Work Desk': Monitor,
  'In-room Safe': Lock,
  Bathtub: Bath,
  'Rain Shower': Droplets,
  Balcony: Mountain,
  'City View': Building2,
  'Sea View': Waves,
  'Garden View': Trees,
  'Lounge Access': Sofa,
  Kitchenette: UtensilsCrossed,
  'Breakfast Included': Coffee,
  Jacuzzi: Sparkles,
  Soundproofing: VolumeX,
  'Wheelchair Accessible': Accessibility,
};

export const amenityIcon = (name) => AMENITY_ICONS[name] || Check;
export { BedDouble };
