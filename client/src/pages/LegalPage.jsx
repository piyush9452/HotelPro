import PageHero from '../components/common/PageHero';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function LegalPage({ title, updated, sections }) {
  useDocumentTitle(title);
  return (
    <>
      <PageHero eyebrow="Legal" title={title} subtitle={`Last updated ${updated}`} />
      <div className="container-page max-w-3xl py-14">
        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-2xl text-navy-950">{s.heading}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-navy-700">
                {s.body.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
