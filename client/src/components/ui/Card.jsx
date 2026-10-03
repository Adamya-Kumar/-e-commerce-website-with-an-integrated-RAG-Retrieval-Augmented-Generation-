import { cn } from './cn.js';

export default function Card({ title, action, className, children }) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xxl bg-card p-7 shadow-spark-md',
        className,
      )}
    >
      {title || action ? (
        <header className="mb-5 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="text-[1.1rem] font-bold text-main">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
