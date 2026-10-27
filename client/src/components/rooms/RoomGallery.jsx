import { useCallback, useEffect, useState } from 'react';
import { BedDouble, ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';

export default function RoomGallery({ images = [], name }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const count = images.length;
  const go = useCallback((delta) => setActive((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, go]);

  if (!count) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-2xl bg-beige-200 text-navy-300">
        <BedDouble className="h-14 w-14" aria-label="No photos available" />
      </div>
    );
  }

  const navBtn = 'absolute top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy-900 shadow hover:bg-white';
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-beige-200">
        <img src={images[active].url} alt={images[active].alt || `${name} photo ${active + 1}`} className="aspect-[16/9] w-full object-cover" />
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className={`${navBtn} left-3`} aria-label="Previous photo"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => go(1)} className={`${navBtn} right-3`} aria-label="Next photo"><ChevronRight className="h-5 w-5" /></button>
          </>
        )}
        <button type="button" onClick={() => setLightbox(true)} className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-navy-950/75 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-950">
          <Expand className="h-3.5 w-3.5" aria-hidden="true" /> View {count} photo{count > 1 ? 's' : ''}
        </button>
      </div>
      {count > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6" aria-label="Photo thumbnails">
          {images.map((img, i) => (
            <li key={img._id || img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={`block w-full overflow-hidden rounded-lg ring-2 transition ${i === active ? 'ring-gold-500' : 'ring-transparent opacity-75 hover:opacity-100'}`}
              >
                <img src={img.url} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/95 p-4" role="dialog" aria-modal="true" aria-label={`${name} photos`}>
          <button type="button" onClick={() => setLightbox(false)} className="absolute top-4 right-4 rounded-full p-2 text-white hover:bg-white/10" aria-label="Close gallery" autoFocus>
            <X className="h-6 w-6" />
          </button>
          <img src={images[active].url} alt={images[active].alt || name} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          {count > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} className={`${navBtn} left-4`} aria-label="Previous photo"><ChevronLeft className="h-6 w-6" /></button>
              <button type="button" onClick={() => go(1)} className={`${navBtn} right-4`} aria-label="Next photo"><ChevronRight className="h-6 w-6" /></button>
            </>
          )}
          <p className="absolute bottom-4 text-sm text-navy-200">{active + 1} / {count}</p>
        </div>
      )}
    </div>
  );
}
