export default function BrandMark({ className = 'h-8 w-8 text-lime' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
        <path d="M16 4v24" />
        <path d="M6.2 10.2 25.8 21.8" />
        <path d="M25.8 10.2 6.2 21.8" />
      </g>
    </svg>
  );
}
