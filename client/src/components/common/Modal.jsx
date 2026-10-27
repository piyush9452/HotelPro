import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** Accessible modal dialog: traps focus, closes on Escape, restores focus on close. */
export function Modal({ open, onClose, title, children, footer, size = 'md', dismissible = true }) {
  const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    (panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE) || panel)?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose?.();
      if (e.key === 'Tab' && panel) {
        const nodes = [...panel.querySelectorAll(FOCUSABLE)];
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={dismissible ? onClose : undefined} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative max-h-[92vh] w-full ${widths[size]} overflow-y-auto rounded-t-2xl bg-white shadow-lift sm:rounded-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-beige-200 px-6 py-4">
          <h2 id={titleId} className="font-serif text-xl text-navy-900">{title}</h2>
          {dismissible && (
            <button type="button" onClick={onClose} className="-mr-2 rounded-lg p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-700" aria-label="Close dialog">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-beige-200 px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Confirmation dialog. `onConfirm` may be async; the dialog shows a spinner
 * and stays open until it settles. Optionally collects a free-text reason.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  reasonLabel,
  reasonRequired = false,
  children,
}) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const reasonId = useId();

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      dismissible={!busy}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={confirm} loading={busy} disabled={reasonRequired && !reason.trim()} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="text-sm text-navy-600">{description}</p>}
      {children}
      {reasonLabel && (
        <div className="mt-4">
          <label htmlFor={reasonId} className="label">{reasonLabel}</label>
          <textarea id={reasonId} rows={3} maxLength={500} className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}
