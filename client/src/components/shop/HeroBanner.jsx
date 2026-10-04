import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button.jsx';

export default function HeroBanner() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden rounded-xxl bg-forest-medium px-6 py-10 text-white shadow-spark-md sm:px-10 sm:py-14">
      <svg
        className="pointer-events-none absolute -bottom-6 -right-6 h-36 w-36 rotate-[15deg] text-lime sm:h-44 sm:w-44"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
      >
        <g transform="translate(50,50)">
          <rect x="-6" y="-45" width="12" height="90" rx="6" fill="currentColor" />
          <rect x="-6" y="-45" width="12" height="90" rx="6" fill="currentColor" transform="rotate(60)" />
          <rect x="-6" y="-45" width="12" height="90" rx="6" fill="currentColor" transform="rotate(120)" />
        </g>
      </svg>
      <div className="relative z-[1] max-w-xl">
        <span className="inline-flex items-center rounded-full bg-lime px-3 py-1 text-xs font-bold text-forest-medium">
          Cash on delivery
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
          Everyday tech, fashion, and home
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-sidebar-muted sm:text-base">
          Browse the Spark Commerce catalog, compare prices, and check out when you are ready.
        </p>
        <Button variant="accent" className="mt-6" onClick={() => navigate('/products')}>
          Shop products
          <i className="bi bi-arrow-right" />
        </Button>
      </div>
    </section>
  );
}
