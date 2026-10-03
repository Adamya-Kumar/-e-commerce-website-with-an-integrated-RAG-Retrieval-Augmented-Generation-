import { cn } from './cn.js';

export default function Skeleton({ className }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-surface-muted', className)}
      aria-hidden="true"
    />
  );
}
