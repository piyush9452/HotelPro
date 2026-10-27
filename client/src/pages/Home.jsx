import { Link } from 'react-router-dom';
import { ArrowRight, Car, ConciergeBell, Dumbbell, Quote, ShieldCheck, Sparkles, Star, UtensilsCrossed, Waves, Wifi } from 'lucide-react';
import SearchForm from '../components/booking/SearchForm';
import RoomCard, { RoomCardSkeleton } from '../components/rooms/RoomCard';
import Button from '../components/common/Button';
import { ErrorState } from '../components/common/Feedback';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { roomService } from '../services/roomService';
import { CATEGORY_LABELS, HOTEL } from '../utils/constants';
import { formatCurrency } from '../utils/format';

const HERO = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=80';
const CATEGORY_IMAGES = {
  standard: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=75',
  deluxe: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=75',
  executive: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=75',
  suite: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=75',
  family: 'https://images.unsplash.com/photo-1576675784201-0e142b423952?auto=format&fit=crop&w=900&q=75',
};

const FACILITIES = [
  { icon: Waves, title: 'Infinity pool', text: 'A heated rooftop pool overlooking the Arabian Sea, open 6am to 10pm.' },
  { icon: Sparkles, title: 'Serenity spa', text: 'Ayurvedic rituals, massages and a eucalyptus steam room.' },
  { icon: UtensilsCrossed, title: 'Fine dining', text: 'Three restaurants and a bar, from coastal Indian to modern European.' },
  { icon: Dumbbell, title: 'Fitness centre', text: '24-hour gym with personal trainers and morning yoga on the terrace.' },
  { icon: Wifi, title: 'Fast Wi-Fi', text: 'Complimentary high-speed internet throughout the property.' },
  { icon: Car, title: 'Airport transfers', text: 'Chauffeured transfers available on request for every guest.' },
];

const TESTIMONIALS = [
  { quote: 'Impeccable service from the moment we arrived. The Ocean Panorama Suite was simply breathtaking at sunset.', name: 'Ananya & Rohan', place: 'Bengaluru' },
  { quote: 'Booking was effortless and the room was exactly as pictured. The executive lounge made my business trip a pleasure.', name: 'David Chen', place: 'Singapore' },
  { quote: 'Our kids loved the family suite and pool. Staff remembered our names all week. We are already planning our return.', name: 'The Mehta family', place: 'Pune' },
];

function SectionHeading({ eyebrow, title, text, action }) {
  return (
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-3xl text-navy-950 sm:text-4xl">{title}</h2>
        {text && <p className="mt-3 text-navy-600">{text}</p>}
      </div>
      {action}
    </div>
  );
}

export default function Home() {
  useDocumentTitle();
  const featured = useAsync(() => roomService.list({ featured: 'true', limit: 3, sort: 'popularity' }), []);
  const meta = useAsync(() => roomService.meta(), []);
  const categories = (meta.data?.categories || []).filter((c) => c.count > 0);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate">
        <img src={HERO} alt="HotelPro façade lit up at dusk" className="absolute inset-0 -z-10 h-full w-full object-cover" fetchPriority="high" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/90 via-navy-950/65 to-navy-950/30" aria-hidden="true" />
        <div className="container-page flex min-h-[640px] flex-col justify-center py-20">
          <p className="text-xs font-semibold tracking-[0.3em] text-gold-400 uppercase">Mumbai · Marine Drive</p>
          <h1 className="mt-4 max-w-2xl text-5xl leading-tight text-white sm:text-6xl">Where every stay becomes a story</h1>
          <p className="mt-5 max-w-xl text-lg text-navy-100">
            Elegant rooms, ocean-view suites and genuinely warm hospitality. Book directly for the best available rates and free cancellation up to 48 hours before arrival.
          </p>
          <SearchForm className="mt-10 max-w-4xl" />
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-100">
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-400" aria-hidden="true" />Secure online payment</li>
            <li className="flex items-center gap-2"><Star className="h-4 w-4 text-gold-400" aria-hidden="true" />Best rate when you book direct</li>
            <li className="flex items-center gap-2"><ConciergeBell className="h-4 w-4 text-gold-400" aria-hidden="true" />24/7 concierge</li>
          </ul>
        </div>
      </section>

      {/* Featured rooms */}
      <section className="container-page py-20">
        <SectionHeading
          eyebrow="Featured stays"
          title="Rooms our guests love"
          text="Hand-picked rooms and suites, each designed for rest, with premium linens, curated amenities and thoughtful details."
          action={<Button variant="outline" to="/rooms">View all rooms <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>}
        />
        {featured.error ? (
          <ErrorState message={featured.error} onRetry={featured.reload} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.loading ? [0, 1, 2].map((i) => <RoomCardSkeleton key={i} />) : featured.data?.map((room) => <RoomCard key={room._id} room={room} />)}
          </div>
        )}
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="bg-white py-20">
          <div className="container-page">
            <SectionHeading eyebrow="Room categories" title="Find the space that suits you" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {categories.map((c) => (
                <Link key={c.value} to={`/rooms?category=${c.value}`} className="group relative isolate flex aspect-[3/4] items-end overflow-hidden rounded-2xl p-5 lg:aspect-[3/5]">
                  <img src={CATEGORY_IMAGES[c.value]} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950/90 via-navy-950/30 to-transparent" aria-hidden="true" />
                  <div>
                    <h3 className="text-2xl text-white">{CATEGORY_LABELS[c.value]}</h3>
                    <p className="mt-1 text-sm text-navy-100">{c.fromPrice ? `From ${formatCurrency(c.fromPrice)} / night` : `${c.count} room types`}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Facilities */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="Amenities & services" title="Everything for an effortless stay" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FACILITIES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-6">
              <span className="inline-flex rounded-xl bg-navy-950 p-3 text-gold-400"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <h3 className="mt-4 text-xl text-navy-950">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-navy-950 py-20 text-white">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <img src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1400&q=75" alt="The HotelPro lobby with marble floors and warm lighting" className="aspect-[4/3] w-full rounded-2xl object-cover" loading="lazy" />
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-gold-400 uppercase">Why HotelPro</p>
            <h2 className="mt-3 text-4xl">Quiet luxury, genuine care</h2>
            <p className="mt-4 text-navy-200">
              For over two decades we have welcomed travellers to the waterfront with the same promise: attentive service without fuss, and rooms that feel like a calm retreat from the city.
            </p>
            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {[['25+', 'Years of hospitality'], ['24/7', 'Concierge & room service'], ['3', 'Restaurants & bar']].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-xs text-navy-300">{l}</dt>
                  <dd className="order-first font-serif text-4xl text-gold-400">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="Guest stories" title="What our guests say" />
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="card flex flex-col p-7">
              <Quote className="h-8 w-8 text-gold-500" aria-hidden="true" />
              <blockquote className="mt-4 flex-1 font-serif text-lg leading-relaxed text-navy-800">“{t.quote}”</blockquote>
              <figcaption className="mt-6 text-sm">
                <span className="font-semibold text-navy-950">{t.name}</span>
                <span className="text-navy-500"> · {t.place}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="relative isolate overflow-hidden rounded-3xl bg-navy-900 px-8 py-14 text-center sm:px-16">
          <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1800&q=70" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" loading="lazy" />
          <h2 className="text-3xl text-white sm:text-4xl">Ready for your next escape?</h2>
          <p className="mx-auto mt-3 max-w-xl text-navy-100">Check live availability and secure your room in minutes. Free cancellation up to 48 hours before check-in.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="gold" size="lg" to="/rooms">Explore rooms</Button>
            <Button variant="light" size="lg" to="/contact">Talk to our team</Button>
          </div>
          <p className="mt-6 text-sm text-navy-200">Prefer to call? <a href={`tel:${HOTEL.phone.replace(/\s/g, '')}`} className="font-semibold text-white underline-offset-2 hover:underline">{HOTEL.phone}</a></p>
        </div>
      </section>
    </>
  );
}
