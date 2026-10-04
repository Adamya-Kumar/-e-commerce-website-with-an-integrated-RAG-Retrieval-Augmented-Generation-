import { cn } from '../ui/cn.js';

export default function ProductImage({ src, icon = 'bi bi-image', label, className }) {
  return (
    <div
      className={cn(
        'flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-promo',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div role="img" aria-label={label} className="flex h-full w-full items-center justify-center">
          <i className={cn(icon, 'text-5xl text-forest-medium')} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
