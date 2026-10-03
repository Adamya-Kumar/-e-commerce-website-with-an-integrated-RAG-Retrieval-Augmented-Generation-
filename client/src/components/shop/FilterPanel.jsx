import { PLACEHOLDER_CATEGORIES } from '../../data/placeholderCatalog.js';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';

export default function FilterPanel({ filters, brands, onChange, onClear }) {
  function patch(partial) {
    onChange({ ...filters, ...partial });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <Select
        id="catalog-category"
        label="Category"
        value={filters.category}
        onChange={(event) => patch({ category: event.target.value })}
      >
        <option value="All">All categories</option>
        {PLACEHOLDER_CATEGORIES.map((category) => (
          <option key={category.slug} value={category.name}>
            {category.name}
          </option>
        ))}
      </Select>
      <Select
        id="catalog-brand"
        label="Brand"
        value={filters.brand}
        onChange={(event) => patch({ brand: event.target.value })}
      >
        <option value="All">All brands</option>
        {brands.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="catalog-min-price"
          label="Min price (₹)"
          type="number"
          min="0"
          inputMode="numeric"
          value={filters.minRupees}
          onChange={(event) => patch({ minRupees: event.target.value })}
        />
        <Input
          id="catalog-max-price"
          label="Max price (₹)"
          type="number"
          min="0"
          inputMode="numeric"
          value={filters.maxRupees}
          onChange={(event) => patch({ maxRupees: event.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-main">
        <input
          type="checkbox"
          className="h-4 w-4 accent-forest-medium"
          checked={filters.inStock}
          onChange={(event) => patch({ inStock: event.target.checked })}
        />
        In stock only
      </label>
      <Button variant="ghost" className="w-full" onClick={onClear}>
        Clear filters
      </Button>
    </form>
  );
}
