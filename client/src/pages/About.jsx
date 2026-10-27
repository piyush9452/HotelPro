import { Award, HeartHandshake, Leaf } from 'lucide-react';
import PageHero from '../components/common/PageHero';
import Button from '../components/common/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const VALUES = [
  { icon: HeartHandshake, title: 'Genuine hospitality', text: 'We remember names, preferences and the small details that turn a stay into a homecoming.' },
  { icon: Award, title: 'Uncompromising quality', text: 'From hand-pressed linens to locally sourced menus, every detail meets our exacting standards.' },
  { icon: Leaf, title: 'Responsible luxury', text: 'Solar-assisted hot water, zero single-use plastics in rooms and partnerships with local artisans.' },
];

export default function About() {
  useDocumentTitle('About us');
  return (
    <>
      <PageHero eyebrow="Our story" title="A waterfront landmark since 1998" subtitle="What began as a twelve-room guesthouse on Marine Drive is today one of Mumbai’s most loved independent hotels." image="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=2000&q=70" />
      <section className="container-page grid items-center gap-12 py-16 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Who we are</p>
          <h2 className="mt-2 text-4xl text-navy-950">Independent, family-run and proudly local</h2>
          <div className="mt-5 space-y-4 leading-relaxed text-navy-700">
            <p>HotelPro was founded by the Kapoor family with a simple belief: luxury should feel personal. Over twenty-five years we have grown to dozens of rooms and suites, a spa, three restaurants and a rooftop pool, without losing the warmth of that first guesthouse.</p>
            <p>Our team of 180 hospitality professionals, many of whom have been with us for over a decade, are the heart of every stay. Whether you are here for business, a family holiday or a once-in-a-lifetime celebration, we are here to make it effortless.</p>
          </div>
          <Button className="mt-8" to="/rooms">Discover our rooms</Button>
        </div>
        <img src="https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=75" alt="Guests relaxing on the HotelPro terrace" className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lift" loading="lazy" />
      </section>
      <section className="bg-white py-16">
        <div className="container-page">
          <h2 className="text-center text-3xl text-navy-950">What we stand for</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-7 text-center">
                <span className="inline-flex rounded-full bg-beige-100 p-4 text-gold-700"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                <h3 className="mt-4 text-xl text-navy-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
