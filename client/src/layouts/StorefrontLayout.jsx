import { Outlet } from 'react-router-dom';
import StorefrontFooter from '../components/shop/StorefrontFooter.jsx';
import StorefrontNavbar from '../components/shop/StorefrontNavbar.jsx';

export default function StorefrontLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-main">
      <StorefrontNavbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <StorefrontFooter />
    </div>
  );
}
