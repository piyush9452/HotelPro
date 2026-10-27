export const CATEGORY_LABELS = {
  standard: 'Standard',
  deluxe: 'Deluxe',
  executive: 'Executive',
  suite: 'Suite',
  family: 'Family',
};

export const BED_LABELS = { king: 'King bed', queen: 'Queen bed', double: 'Double bed', twin: 'Twin beds', single: 'Single bed' };

export const SORT_OPTIONS = [
  { value: 'popularity', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'capacity', label: 'Largest capacity' },
  { value: 'newest', label: 'Newest' },
];

export const BOOKING_STATUS = {
  pending: { label: 'Awaiting payment', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'green' },
  checked_in: { label: 'Checked in', tone: 'blue' },
  checked_out: { label: 'Completed', tone: 'navy' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  expired: { label: 'Expired', tone: 'gray' },
  no_show: { label: 'No-show', tone: 'gray' },
};

export const PAYMENT_STATUS = {
  unpaid: { label: 'Unpaid', tone: 'amber' },
  paid: { label: 'Paid', tone: 'green' },
  refund_pending: { label: 'Refund pending', tone: 'amber' },
  refunded: { label: 'Refunded', tone: 'blue' },
  partially_refunded: { label: 'Partially refunded', tone: 'blue' },
};

export const HOTEL = {
  name: 'HotelPro',
  address: '21 Marine Drive, Mumbai, Maharashtra 400020, India',
  phone: '+91 22 4000 1234',
  email: 'stay@hotelpro.example',
  checkIn: '2:00 PM',
  checkOut: '11:00 AM',
};
