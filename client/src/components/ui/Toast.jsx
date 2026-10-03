import { cn } from './cn.js';

const tones = {
  success: 'border-sys-green bg-sys-green-bg text-forest-dark',
  danger: 'border-sys-red bg-sys-red-bg text-forest-dark',
  warning: 'border-sys-orange bg-sys-orange-bg text-forest-dark',
};

const icons = {
  success: 'bi bi-check-circle',
  danger: 'bi bi-exclamation-circle',
  warning: 'bi bi-exclamation-triangle',
};

export default function Toast({ tone = 'success', message, onClose }) {
  if (!message) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-spark-lg',
        tones[tone],
      )}
    >
      <i className={cn(icons[tone], 'text-[1.15rem]')} />
      <p className="flex-1">{message}</p>
      {onClose ? (
        <button
          type="button"
          aria-label="Dismiss notification"
          className="rounded-md p-1 opacity-50 transition duration-200 hover:bg-canvas hover:opacity-100"
          onClick={onClose}
        >
          <i className="bi bi-x-lg" />
        </button>
      ) : null}
    </div>
  );
}
