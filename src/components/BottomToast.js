import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './BottomToast.css';

export default function BottomToast({
  open,
  message = '',
  isLightTheme = false,
  duration = 4800,
  onClose,
}) {
  useEffect(() => {
    if (!open || duration <= 0) {
      return undefined;
    }
    const id = window.setTimeout(() => {
      if (typeof onClose === 'function') {
        onClose();
      }
    }, duration);
    return () => window.clearTimeout(id);
  }, [open, duration, onClose]);

  if (!open || !String(message).trim()) {
    return null;
  }

  const rootClass = `bottom-toast-portal${isLightTheme ? ' bottom-toast-portal--light' : ''}`;

  return createPortal(
    <div className={rootClass} role="status" aria-live="polite" aria-atomic="true">
      <div className="bottom-toast">{String(message).trim()}</div>
    </div>,
    document.body
  );
}
