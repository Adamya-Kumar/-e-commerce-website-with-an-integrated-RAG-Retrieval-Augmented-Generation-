import { cn } from './cn.js';
import { fieldClass, labelClass } from './fieldClasses.js';

export default function Select({
  id,
  label,
  message,
  invalid = false,
  valid = false,
  className,
  children,
  ...props
}) {
  const state = invalid ? 'invalid' : valid ? 'valid' : 'default';

  return (
    <label className="block" htmlFor={id}>
      {label ? <span className={labelClass}>{label}</span> : null}
      <span className="relative block">
        <select
          id={id}
          aria-invalid={invalid || undefined}
          className={cn(fieldClass(state), 'appearance-none pr-10', className)}
          {...props}
        >
          {children}
        </select>
        <i className="bi bi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-forest-medium" />
      </span>
      {message ? (
        <p
          className={cn(
            'mt-1.5 block text-xs font-bold',
            invalid ? 'text-sys-red' : 'text-sys-green',
          )}
        >
          {message}
        </p>
      ) : null}
    </label>
  );
}
