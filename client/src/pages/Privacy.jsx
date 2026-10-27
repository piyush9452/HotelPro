import LegalPage from './LegalPage';
import { HOTEL } from '../utils/constants';

const SECTIONS = [
  { heading: 'Information we collect', body: ['When you create an account or book a stay we collect your name, email address, phone number, stay dates, guest details and any special requests you provide.', 'Payments are processed by our payment partner (Razorpay). We never receive or store your full card number, CVV or banking credentials. We store only payment references and status.'] },
  { heading: 'How we use your information', body: ['To manage your reservations, send booking confirmations and service messages, respond to enquiries and meet our legal obligations, including guest registration requirements.', 'We do not sell your personal data. We share it only with service providers who help us operate (such as payment processing and email delivery) under strict confidentiality.'] },
  { heading: 'Security', body: ['Passwords are stored as one-way salted hashes. Sessions use secure, HTTP-only cookies. Administrative actions are logged and access is restricted to authorised staff.'] },
  { heading: 'Retention and your rights', body: ['We keep booking records for as long as required by tax and hospitality regulations. You may request access to, correction of, or deletion of your personal data where the law permits.', `To exercise these rights, contact us at ${HOTEL.email}.`] },
  { heading: 'Cookies', body: ['We use strictly necessary cookies to keep you signed in and to protect forms against cross-site request forgery. We do not use advertising cookies.'] },
];

export default function Privacy() {
  return <LegalPage title="Privacy policy" updated="1 October 2026" sections={SECTIONS} />;
}
