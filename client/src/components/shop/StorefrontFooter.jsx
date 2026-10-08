import { Link } from 'react-router-dom';
import BrandMark from '../brand/BrandMark.jsx';

const columns = [
  {
    title: 'Shop',
    links: [
      { to: '/', label: 'Home' },
      { to: '/products', label: 'Products' },
      { to: '/cart', label: 'Cart' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/account', label: 'My account' },
      { to: '/login', label: 'Sign in' },
      { to: '/register', label: 'Register' },
    ],
  },
];

export default function StorefrontFooter() {
  return (
    <footer className="mt-auto bg-forest-dark text-sidebar-muted">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-bold text-white">
            <BrandMark className="h-7 w-7" />
            Spark Commerce
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Shop with cash on delivery. Orders, addresses, and returns live in your account.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] opacity-60">{column.title}</p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm transition duration-200 ease-in-out hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
