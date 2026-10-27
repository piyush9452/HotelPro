import Logo from '../common/Logo';

const IMAGE = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=75';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/40 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="font-serif text-3xl leading-snug">“The art of hospitality is to make guests feel at home when you wish they were.”</p>
          <p className="mt-3 text-sm text-gold-400">HotelPro, since 1998</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden"><Logo /></div>
          <h1 className="mt-6 text-3xl text-navy-950 lg:mt-0">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-navy-600">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-navy-600">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
