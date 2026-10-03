import { useEffect, useId, useRef, useState } from 'react';
import { cn } from './cn.js';

export default function Dropdown({ label, items }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-4 py-2.5 text-sm font-semibold text-forest-dark transition duration-200 ease-in-out hover:border-forest-medium hover:bg-surface-muted focus-visible:outline-none focus-visible:shadow-focus-strong"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <i
          className={cn(
            'bi bi-chevron-down text-xs text-muted-green transition duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1.5 min-w-[10.5rem] rounded-lg border border-light bg-card p-1.5 shadow-spark-lg"
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[0.85rem] font-semibold text-muted-green transition duration-150 ease-in-out hover:bg-canvas hover:text-main focus-visible:outline-none focus-visible:bg-canvas',
                  item.tone === 'danger' &&
                    'hover:bg-sys-red-bg hover:text-sys-red',
                )}
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
              >
                {item.icon ? <i className={item.icon} /> : null}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
