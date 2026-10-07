import { Link } from 'react-router-dom';
import { formatInr } from '../../lib/money.js';

export default function ProductCardMini({ products = [] }) {
  const list = Array.isArray(products) ? products : [products].filter(Boolean);

  if (!list.length) return null;

  return (
    <div className="space-y-2">
      {list.map((product, index) => {
        const title = product?.title || product?.name || 'Product';
        const slug = product?.slug || product?.id || `product-${index}`;
        const image = product?.image || product?.imageUrl || 'https://placehold.co/160x120/f4f6f5/072f1f?text=Product';
        const price = Number(product?.price_paise ?? product?.pricePaise ?? product?.price ?? 0);
        const inStock = product?.in_stock ?? Number(product?.stock ?? 0) > 0;

        return (
          <Link
            key={`${slug}-${index}`}
            to={slug.startsWith('/products/') ? slug : `/products/${slug}`}
            className="block rounded-2xl border border-light bg-white p-3 shadow-spark-sm transition hover:border-forest-medium/60"
          >
            <div className="flex gap-3">
              <img src={image} alt={title} className="h-16 w-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold text-main">{title}</p>
                <p className="mt-1 text-[11px] text-muted-green">{product?.brand || 'Spark Commerce'}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-forest-medium">{formatInr(price)}</span>
                  <span className="rounded-full bg-lime-soft px-2 py-0.5 text-[10px] font-semibold text-forest-medium">
                    {inStock ? 'In stock' : 'Sold out'}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
