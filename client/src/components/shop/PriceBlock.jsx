import { formatInr, unitPricePaise } from '../../lib/money.js';
import { cn } from '../ui/cn.js';

export default function PriceBlock({ price, discountPercent = 0, size = 'card' }) {
  const sale = unitPricePaise(price, discountPercent);
  const detail = size === 'detail';

  return (
    <div>
      <p
        className={cn(
          'font-extrabold leading-none tracking-[-0.03em] text-main',
          detail ? 'text-[2rem]' : 'text-[1.35rem]',
        )}
      >
        {formatInr(sale)}
      </p>
      {discountPercent > 0 ? (
        <p className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-green line-through">{formatInr(price)}</span>
          <span className="inline-flex items-center gap-1 text-[0.785rem] font-semibold text-sys-green">
            <i className="bi bi-arrow-down-right" aria-hidden="true" />
            {discountPercent}% off
          </span>
        </p>
      ) : null}
    </div>
  );
}
