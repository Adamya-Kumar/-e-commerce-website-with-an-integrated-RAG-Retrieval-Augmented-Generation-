import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-xl rounded-[24px] border border-border-light bg-white p-8 text-center shadow-spark-lg">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted-green">404</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.06em] text-main">Page not found</h1>
        <p className="mt-4 text-sm leading-6 text-main/80">
          The page you requested is unavailable or may have moved. Head back to the storefront to keep browsing.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="inline-flex">
            <Button variant="primary">Back to home</Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}
