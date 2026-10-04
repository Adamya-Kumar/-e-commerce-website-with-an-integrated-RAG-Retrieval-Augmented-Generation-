import { useState } from 'react';
import { cn } from '../ui/cn.js';
import ProductImage from './ProductImage.jsx';

export default function ProductGallery({ product }) {
  const [index, setIndex] = useState(0);
  const frames =
    product.images?.length > 0
      ? product.images.map((image, frameIndex) => ({
          src: image.url,
          label: `${product.title} image ${frameIndex + 1}`,
        }))
      : [{ src: '', label: product.title }];
  const active = frames[index] ?? frames[0];

  return (
    <div>
      <ProductImage src={active.src} label={active.label} className="bg-card shadow-spark-sm" />
      {frames.length > 1 ? (
        <div className="mt-3 grid grid-cols-3 gap-3" role="listbox" aria-label="Product images">
          {frames.map((frame, frameIndex) => {
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
                <ProductImage src={frame.src} label={frame.label} className="aspect-[4/3]" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
