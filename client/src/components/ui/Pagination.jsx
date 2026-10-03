import { cn } from './cn.js';

export default function Pagination({ page, totalPages, onChange }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-2">
      <PageButton
        label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <i className="bi bi-chevron-left" />
      </PageButton>
      {pages.map((number) => (
        <PageButton
          key={number}
          label={`Page ${number}`}
          current={number === page}
          onClick={() => onChange(number)}
        >
          {number}
        </PageButton>
      ))}
      <PageButton
        label="Next page"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <i className="bi bi-chevron-right" />
      </PageButton>
    </nav>
  );
}

function PageButton({ children, current, disabled, label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-semibold transition duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:shadow-focus-strong',
        'disabled:pointer-events-none disabled:opacity-50',
        current
          ? 'bg-forest-medium text-white'
          : 'bg-transparent text-forest-dark hover:bg-surface-muted hover:text-forest-medium',
      )}
    >
      {children}
    </button>
  );
}
