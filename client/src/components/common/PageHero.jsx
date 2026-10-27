export default function PageHero({ eyebrow, title, subtitle, image, children }) {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950">
      {image && <img src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-950/40 via-navy-950/60 to-navy-950" aria-hidden="true" />
      <div className="container-page py-16 sm:py-20">
        {eyebrow && <p className="text-xs font-semibold tracking-[0.25em] text-gold-400 uppercase">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl text-4xl text-white sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-base text-navy-100 sm:text-lg">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
