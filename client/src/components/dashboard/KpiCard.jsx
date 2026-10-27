export default function KpiCard({ label, value, hint, icon: Icon, accent = false }) {
  return (
    <div className={`card p-5 ${accent ? 'bg-navy-950 text-white' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${accent ? 'text-navy-200' : 'text-navy-500'}`}>{label}</p>
        {Icon && (
          <span className={`rounded-lg p-2 ${accent ? 'bg-white/10 text-gold-400' : 'bg-beige-100 text-gold-700'}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className={`mt-2 font-serif text-3xl ${accent ? 'text-white' : 'text-navy-950'}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs ${accent ? 'text-navy-300' : 'text-navy-500'}`}>{hint}</p>}
    </div>
  );
}
