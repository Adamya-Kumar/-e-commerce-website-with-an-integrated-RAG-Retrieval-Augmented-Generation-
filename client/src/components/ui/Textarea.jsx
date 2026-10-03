import { cn } from './cn.js';
import { fieldClass, labelClass } from './fieldClasses.js';

export default function Textarea({
  id,
  label,
  message,
  invalid = false,
  valid = false,
  className,
  rows = 4,
  ...props
}) {
  const state = invalid ? 'invalid' : valid ? 'valid' : 'default';

  return (
    <label className="block" htmlFor={id}>
      {label ? <span className={labelClass}>{label}</span> : null}
      <textarea
        id={id}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(fieldClass(state), 'resize-y', className)}
        {...props}
      />
      {message ? (
        <p
          className={cn(
            'mt-1.5 block text-xs font-bold',
            invalid
              ? 'text-sys-red'
              : valid
                ? 'text-sys-green'
                : 'text-muted-green',
          )}
        >
          {message}
        </p>
      ) : null}
    </label>
  );
}
