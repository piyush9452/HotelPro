import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Label + control + error/hint, wired up for screen readers. */
export function FormField({ label, error, hint, required, children, className = '', id: idProp }) {
  const generated = useId();
  const id = idProp || generated;
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required ? true : undefined })}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-navy-500">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, required, className, inputClassName = '', ...props }, ref) {
  return (
    <FormField label={label} error={error} hint={hint} required={required} className={className} id={props.id}>
      {(a11y) => <input ref={ref} className={`field ${error ? 'field-error' : ''} ${inputClassName}`} {...a11y} {...props} />}
    </FormField>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, required, className, rows = 4, ...props }, ref) {
  return (
    <FormField label={label} error={error} hint={hint} required={required} className={className} id={props.id}>
      {(a11y) => <textarea ref={ref} rows={rows} className={`field resize-y ${error ? 'field-error' : ''}`} {...a11y} {...props} />}
    </FormField>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, required, className, options = [], placeholder, children, ...props }, ref) {
  return (
    <FormField label={label} error={error} hint={hint} required={required} className={className} id={props.id}>
      {(a11y) => (
        <select ref={ref} className={`field pr-8 ${error ? 'field-error' : ''}`} {...a11y} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          {children}
        </select>
      )}
    </FormField>
  );
});

export const PasswordInput = forwardRef(function PasswordInput({ label = 'Password', error, hint, required, className, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField label={label} error={error} hint={hint} required={required} className={className} id={props.id}>
      {(a11y) => (
        <div className="relative">
          <input ref={ref} type={visible ? 'text' : 'password'} className={`field pr-11 ${error ? 'field-error' : ''}`} {...a11y} {...props} />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-navy-400 hover:text-navy-700"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      )}
    </FormField>
  );
});

export function Checkbox({ label, className = '', ...props }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 text-sm text-navy-700 ${className}`}>
      <input type="checkbox" className="h-4 w-4 rounded border-navy-300 accent-navy-900" {...props} />
      <span>{label}</span>
    </label>
  );
}
