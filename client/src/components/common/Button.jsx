import { Link } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-navy-900 text-white hover:bg-navy-800 shadow-sm',
  gold: 'bg-gold-500 text-navy-950 hover:bg-gold-400 shadow-sm',
  outline: 'border border-navy-200 bg-white text-navy-900 hover:border-navy-400 hover:bg-navy-50',
  ghost: 'text-navy-700 hover:bg-navy-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  light: 'border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20',
};
const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2',
};

export function buttonClasses({ variant = 'primary', size = 'md', block = false, className = '' } = {}) {
  return [
    'inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    block ? 'w-full' : '',
    className,
  ].join(' ');
}

export default function Button({ variant, size, block, loading = false, disabled, to, href, className, children, type = 'button', ...props }) {
  const classes = buttonClasses({ variant, size, block, className });
  const content = (
    <>
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={classes} {...props}>{content}</Link>;
  if (href) return <a href={href} className={classes} {...props}>{content}</a>;
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
}
