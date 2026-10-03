import { Link } from 'react-router-dom';
import { cn } from '../ui/cn.js';

export default function CategoryChips({ categories, value = 'All', onChange }) {
  const items = [{ name: 'All', slug: 'all' }, ...categories];

  if (!onChange) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <Link
            key={category.slug}
            to="/products"
            state={{ category: category.name }}
            className="shrink-0 rounded-full bg-card px-4 py-2 text-sm font-semibold text-main shadow-spark-sm transition duration-200 ease-in-out hover:bg-lime-soft"
          >
            {category.name}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categories">
      {items.map((category) => {
        const active = value === category.name;
        return (
          <button
            key={category.slug}
            type="button"
            aria-pressed={active}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition duration-200 ease-in-out',
              active
                ? 'bg-forest-medium text-white'
                : 'bg-card text-main shadow-spark-sm hover:bg-lime-soft',
            )}
            onClick={() => onChange(category.name)}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
