import { AlertCircle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-3 py-12 text-navy-500 ${className}`}>
      <LoaderCircle className="h-6 w-6 animate-spin text-gold-600" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-beige-200/70 ${className}`} aria-hidden="true" />;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-beige-300 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 rounded-full bg-beige-100 p-3 text-gold-700">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="font-serif text-xl text-navy-900">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-navy-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'We couldn’t load this', message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-red-500" aria-hidden="true" />
      <h3 className="font-serif text-xl text-navy-900">{title}</h3>
      {message && <p className="mt-2 max-w-md text-sm text-red-700">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}

export function Alert({ tone = 'info', title, children, className = '' }) {
  const tones = {
    info: 'border-navy-200 bg-navy-50 text-navy-800',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]} ${className}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
    </div>
  );
}
