import { cn } from '../ui/cn.js';

export default function ProductImage({ icon, label, className }) {
  return (
    <div
      className={cn(
        'flex aspect-square items-center justify-center rounded-lg bg-promo',
        className,
      )}
      role="img"
      aria-label={label}
    >
      <i className={cn(icon, 'text-5xl text-forest-medium')} aria-hidden="true" />
    </div>
  );
}
