import { useState } from 'react';
import { cn } from '../ui/cn.js';

export default function PasswordField({ id, label, invalid, message, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="mb-5 block" htmlFor={id}>
      <span className="mb-2 block text-[0.8rem] font-bold text-main">{label}</span>
      <span className="relative flex items-center">
        <i className="bi bi-shield-lock pointer-events-none absolute left-5 text-[1.1rem] text-muted-green" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={invalid || undefined}
          className={cn(
            'w-full rounded-lg border bg-canvas py-3 pl-11 pr-11 text-[0.9rem] font-semibold text-main outline-none transition duration-200 ease-in-out placeholder:text-placeholder focus:border-forest-medium focus:bg-card focus:shadow-focus',
            invalid ? 'border-sys-red' : 'border-light',
          )}
          {...props}
        />
        <button
          type="button"
          className="absolute right-5 text-[1.1rem] text-muted-green transition duration-200 hover:text-forest-medium"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((value) => !value)}
        >
          <i className={visible ? 'bi bi-eye-slash' : 'bi bi-eye'} />
        </button>
      </span>
      {message ? <span className="mt-1.5 block text-xs font-bold text-sys-red">{message}</span> : null}
    </label>
  );
}
