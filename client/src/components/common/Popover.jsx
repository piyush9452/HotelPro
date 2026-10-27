import { useEffect, useRef } from 'react';

/** Lightweight popover that closes on outside click or Escape. */
export default function Popover({ open, onClose, children, className = '', align = 'left' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.parentElement.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} className={`absolute top-full z-30 mt-2 rounded-2xl border border-beige-200 bg-white p-4 shadow-lift ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}>
      {children}
    </div>
  );
}
