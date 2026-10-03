import { cn } from './cn.js';
import { fieldClass, labelClass } from './fieldClasses.js';

function fieldState({ invalid, valid }) {
  if (invalid) return 'invalid';
  if (valid) return 'valid';
  return 'default';
}

function FieldMessage({ invalid, valid, message }) {
  if (!message) return null;
  return (
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
  );
}

export default function Input({
  id,
  label,
  message,
  invalid = false,
  valid = false,
  className,
  ...props
}) {
  return (
    <label className="block" htmlFor={id}>
      {label ? <span className={labelClass}>{label}</span> : null}
      <input
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(fieldClass(fieldState({ invalid, valid })), className)}
        {...props}
      />
      <FieldMessage invalid={invalid} valid={valid} message={message} />
    </label>
  );
}
