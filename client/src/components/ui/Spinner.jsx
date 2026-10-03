import { cn } from './cn.js';

export default function Spinner({ label = 'Loading', className }) {
  return (
    <span
      role="status"
      className={cn('inline-flex items-center gap-2', className)}
    >
      <i className="bi bi-arrow-repeat animate-spin text-[1.25rem] text-forest-medium" />
      <span className="text-sm font-medium text-muted-green">{label}</span>
    </span>
  );
}
