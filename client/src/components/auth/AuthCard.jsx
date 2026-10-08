import { Link } from 'react-router-dom';
import BrandMark from '../brand/BrandMark.jsx';

export default function AuthCard({ subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-6 py-8">
      <div className="pointer-events-none absolute -left-12 -top-12 h-[300px] w-[300px] rounded-full bg-lime-soft blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-12 h-[400px] w-[400px] rounded-full bg-lime-soft blur-3xl" />
      <div className="relative z-[1] w-full max-w-[450px] rounded-xxl border border-light bg-card p-10 shadow-spark-lg">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-3 text-2xl font-extrabold text-forest-dark"
        >
          <BrandMark className="h-9 w-9 text-forest-medium" />
          <span>Spark Commerce</span>
        </Link>
        <p className="mb-8 text-center text-sm text-muted-green">{subtitle}</p>
        {children}
        <p className="mt-6 text-center text-sm text-muted-green">{footer}</p>
      </div>
    </div>
  );
}
