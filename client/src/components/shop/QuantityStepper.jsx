import { cn } from '../ui/cn.js';

export default function QuantityStepper({ value, min = 1, max, onChange, disabled = false }) {
  const atMin = disabled || value <= min;
  const atMax = disabled || value >= max;

  return (
    <div className="inline-flex items-center rounded-lg border border-light bg-card">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={atMin}
        className={stepClass}
        onClick={() => onChange(value - 1)}
      >
        <i className="bi bi-dash" />
      </button>
      <span className="min-w-10 text-center text-sm font-bold text-main" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={atMax}
        className={stepClass}
        onClick={() => onChange(value + 1)}
      >
        <i className="bi bi-plus" />
      </button>
    </div>
  );
}

const stepClass = cn(
  'inline-flex h-10 w-10 items-center justify-center text-lg text-main',
  'transition duration-200 ease-in-out hover:text-forest-medium',
  'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-main',
);
