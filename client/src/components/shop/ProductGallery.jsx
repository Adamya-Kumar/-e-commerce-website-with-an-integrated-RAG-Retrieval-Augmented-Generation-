import { useState } from 'react';
import { cn } from '../ui/cn.js';
import ProductImage from './ProductImage.jsx';

export default function ProductGallery({ product }) {
  const [index, setIndex] = useState(0);
  const active = product.gallery[index] ?? product.gallery[0];

  return (
    <div>
      <ProductImage icon={active.icon} label={`${product.title}, ${active.label}`} className="bg-card shadow-spark-sm" />
      <div className="mt-3 grid grid-cols-3 gap-3" role="listbox" aria-label="Product images">
        {product.gallery.map((frame, frameIndex) => {
          const selected = frameIndex === index;
          return (
            <button
              key={frame.label}
              type="button"
              role="option"
              aria-selected={selected}
              className={cn(
                'rounded-lg p-1 transition duration-200 ease-in-out',
                selected ? 'bg-lime-soft ring-2 ring-forest-medium' : 'hover:bg-canvas',
              )}
              onClick={() => setIndex(frameIndex)}
            >
              <ProductImage icon={frame.icon} label={frame.label} className="aspect-[4/3]" />
              <span className="mt-1 block text-center text-xs font-semibold text-muted-green">{frame.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
