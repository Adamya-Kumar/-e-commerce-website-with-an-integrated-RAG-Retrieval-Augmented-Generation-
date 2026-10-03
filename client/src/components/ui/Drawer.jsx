import { useEffect } from 'react';
import Button from './Button.jsx';
import { cn } from './cn.js';

export default function Drawer({ open, title, children, onClose }) {
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

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        open ? 'pointer-events-auto' : 'pointer-events-none invisible',
      )}
      aria-hidden={!open}
      inert={open ? undefined : true}
    >
      <button
        type="button"
        aria-label="Close drawer"
        className={cn(
          'absolute inset-0 bg-overlay backdrop-blur-sm transition-opacity duration-300 ease-drawer',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="spark-drawer-title"
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col bg-card shadow-spark-lg transition-transform duration-300 ease-drawer sm:w-drawer sm:rounded-l-xxl',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between bg-forest-dark px-6 py-5 text-white">
          <h2
            id="spark-drawer-title"
            className="flex items-center gap-2 text-[1.1rem] font-bold text-white"
          >
            <i className="bi bi-stars text-lime" />
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Close"
            className="text-white hover:bg-forest-light"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>
  );
}
