import LegalPage from './LegalPage';

const SECTIONS = [
  { heading: 'Reservations', body: ['A booking is confirmed only once payment has been successfully verified and you have received a booking reference. Unpaid bookings hold rooms for a limited time (15 minutes by default) and are released automatically afterwards.', 'Rates are quoted per room per night in Indian Rupees and are subject to applicable taxes (12%) and a service fee (3%), which are shown before you pay.'] },
  { heading: 'Check-in and check-out', body: ['Check-in is from 2:00 PM and check-out is by 11:00 AM local time. A valid government-issued photo ID is required for every adult guest at check-in.', 'Each room must be occupied by at least one adult. The number of guests may not exceed the stated capacity of the room.'] },
  { heading: 'Cancellation policy', body: ['Cancellations made at least 48 hours before the check-in time are refunded in full.', 'Cancellations made later than 48 hours before check-in are charged one night (including its share of taxes and fees); the remainder is refunded.', 'Bookings cannot be cancelled online after the check-in time has passed. No-shows are charged in full. Refunds are returned to the original payment method and may take 5–7 business days to appear.'] },
  { heading: 'Hotel-initiated changes', body: ['In the rare event that we must cancel your reservation (for example, due to unforeseen maintenance), you will receive a full refund and our team will help you find alternative accommodation.'] },
  { heading: 'Conduct and liability', body: ['Guests are responsible for any damage caused to hotel property during their stay. The hotel is not liable for loss of valuables not deposited in the in-room safe or at the front desk.'] },
];

export default function Terms() {
  return <LegalPage title="Terms & conditions" updated="1 October 2026" sections={SECTIONS} />;
}
