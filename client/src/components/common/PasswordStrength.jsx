import { passwordStrength } from '../../utils/validation';

const LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];

export default function PasswordStrength({ value }) {
  if (!value) return null;
  const score = passwordStrength(value);
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < score ? COLORS[score] : 'bg-beige-200'}`} />)}
      </div>
      <p className="mt-1 text-xs text-navy-500">Password strength: {LABELS[score]}</p>
    </div>
  );
}
