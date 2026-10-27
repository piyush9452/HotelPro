import { Check } from 'lucide-react';

export default function Steps({ steps, current }) {
  return (
    <ol className="flex items-center gap-2 text-sm sm:gap-4" aria-label="Booking progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-4" aria-current={active ? 'step' : undefined}>
            <span className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${done ? 'bg-gold-500 text-navy-950' : active ? 'bg-navy-900 text-white' : 'bg-beige-200 text-navy-500'}`}>
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={`hidden sm:inline ${active ? 'font-semibold text-navy-950' : 'text-navy-500'}`}>{label}</span>
            </span>
            {i < steps.length - 1 && <span className="h-px w-6 bg-beige-300 sm:w-12" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
