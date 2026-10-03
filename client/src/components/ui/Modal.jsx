import { useEffect } from 'react';
import Button from './Button.jsx';
import { cn } from './cn.js';

export default function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  className,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spark-modal-title"
        className={cn(
          'relative z-10 w-full max-w-lg rounded-xxl bg-card p-7 shadow-spark-lg',
          className,
        )}
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <h2
            id="spark-modal-title"
            className="text-[1.1rem] font-bold text-main"
          >
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Close"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" />
          </Button>
        </header>
        <div className="text-sm text-main">{children}</div>
        {footer ? (
          <footer className="mt-6 flex justify-end gap-3">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
