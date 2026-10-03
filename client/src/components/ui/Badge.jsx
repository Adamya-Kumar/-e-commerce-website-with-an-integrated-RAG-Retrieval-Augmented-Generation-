import { cn } from './cn.js';

const tones = {
  success: 'bg-badge-success text-sys-green before:bg-sys-green',
  pending: 'bg-badge-pending text-sys-orange before:bg-sys-orange',
  failed: 'bg-badge-failed text-sys-red before:bg-sys-red',
  neutral: 'bg-canvas text-muted-green before:bg-muted-green',
};

export default function Badge({ tone = 'neutral', children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
        'before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:content-[""]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
