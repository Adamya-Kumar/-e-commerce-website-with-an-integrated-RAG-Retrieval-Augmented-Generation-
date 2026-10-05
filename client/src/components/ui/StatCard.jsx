import { cn } from './cn.js';

export default function StatCard({
  label,
  value,
  trend,
  detail,
  trendDirection = 'up',
}) {
  const rising = trendDirection === 'up';

  return (
    <article className="h-full rounded-xxl bg-card p-7 shadow-spark-md">
      <p className="mb-3 text-sm font-medium text-muted-green">{label}</p>
      <p className="mb-3 text-[2rem] font-extrabold leading-none tracking-[-0.03em] text-main">
        {value}
      </p>
      {trend ? (
        <p
          className={cn(
            'inline-flex items-center gap-1.5 text-[0.785rem] font-semibold',
            rising ? 'text-sys-green' : 'text-sys-red',
          )}
        >
          <i
            className={
              rising ? 'bi bi-arrow-up-right' : 'bi bi-arrow-down-right'
            }
          />
          {trend}
        </p>
      ) : null}
      {detail ? <p className="mt-2 text-xs text-muted-green">{detail}</p> : null}
    </article>
  );
}
