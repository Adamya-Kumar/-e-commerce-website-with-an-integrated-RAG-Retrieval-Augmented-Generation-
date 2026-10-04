import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { useCart } from '../../context/useCart.js';
import { patchCatalogSearch } from '../../lib/catalogParams.js';
import { cn } from '../ui/cn.js';

const SEARCH_DEBOUNCE_MS = 300;

export default function StorefrontNavbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState(() => params.get('q') || '');
  const searchTextRef = useRef(searchText);
  searchTextRef.current = searchText;
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const queryFromUrl = params.get('q') || '';

  const applySearch = useCallback(
    (raw) => {
      const nextQ = raw.trim();
      const current = new URLSearchParams(window.location.search);
      const currentQ = current.get('q') || '';
      if (nextQ === currentQ) return;
      const next = patchCatalogSearch(current, { q: nextQ });
      const search = next.toString();
      if (window.location.pathname === '/products') {
        navigate({ pathname: '/products', search }, { replace: true });
        return;
      }
      if (nextQ) {
        navigate({ pathname: '/products', search });
      }
    },
    [navigate],
  );

  useEffect(() => {
    setSearchText(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      applySearch(searchTextRef.current);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchText, applySearch]);

  async function onLogout() {
    setOpen(false);
    try {
      await logout();
      navigate('/');
    } catch {
      // Toast is raised in AuthContext.
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-navbar backdrop-blur-[12px]">
      <div className="mx-auto flex h-navbar max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold text-forest-dark">
          <i className="bi bi-asterisk text-[1.35rem] text-lime" />
          <span className="hidden sm:inline">Spark Commerce</span>
        </Link>

        <form
          className="relative min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch(searchText);
          }}
        >
          <input
            type="search"
            placeholder="Search products"
            aria-label="Search products"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="w-full rounded-full border border-light bg-card py-2.5 pl-4 pr-11 text-sm font-medium text-main shadow-spark-sm outline-none transition duration-200 ease-in-out placeholder:text-placeholder focus:border-forest-medium focus:shadow-focus"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-green"
          >
            <i className="bi bi-search" />
          </button>
        </form>

        <Link
          to="/cart"
          aria-label={`Cart, ${count} items`}
          className="relative inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-light bg-card text-[1.15rem] text-main shadow-spark-sm transition duration-200 ease-in-out hover:text-forest-medium"
        >
          <i className="bi bi-bag" />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1 text-[0.65rem] font-bold text-forest-dark">
            {count}
          </span>
        </Link>

        <div ref={rootRef} className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            className="inline-flex h-[42px] items-center gap-2 rounded-full border border-light bg-card px-3 text-sm font-semibold text-main shadow-spark-sm transition duration-200 ease-in-out hover:text-forest-medium"
            onClick={() => setOpen((value) => !value)}
          >
            <i className="bi bi-person text-[1.15rem]" />
            <span className="hidden max-w-[8rem] truncate md:inline">{user ? user.name : 'Account'}</span>
            <i className={cn('bi bi-chevron-down text-xs text-muted-green', open && 'rotate-180')} />
          </button>
          {open ? (
            <ul
              id={menuId}
              role="menu"
              className="absolute right-0 z-20 mt-2 min-w-[11rem] rounded-xl border border-light bg-card py-2 shadow-spark-lg"
            >
              {user ? (
                <>
                  <li>
                    <Link
                      role="menuitem"
                      to="/account"
                      className="block px-4 py-2 text-sm font-semibold text-main hover:bg-canvas"
                      onClick={() => setOpen(false)}
                    >
                      My account
                    </Link>
                  </li>
                  {user.role === 'admin' ? (
                    <li>
                      <Link
                        role="menuitem"
                        to="/admin"
                        className="block px-4 py-2 text-sm font-semibold text-main hover:bg-canvas"
                        onClick={() => setOpen(false)}
                      >
                        Admin
                      </Link>
                    </li>
                  ) : null}
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm font-semibold text-sys-red hover:bg-sys-red-bg"
                      onClick={onLogout}
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      role="menuitem"
                      to="/login"
                      className="block px-4 py-2 text-sm font-semibold text-main hover:bg-canvas"
                      onClick={() => setOpen(false)}
                    >
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link
                      role="menuitem"
                      to="/register"
                      className="block px-4 py-2 text-sm font-semibold text-main hover:bg-canvas"
                      onClick={() => setOpen(false)}
                    >
                      Register
                    </Link>
                  </li>
                </>
              )}
            </ul>
          ) : null}
        </div>
      </div>
    </header>
  );
}
