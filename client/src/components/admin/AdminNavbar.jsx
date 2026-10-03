import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { cn } from '../ui/cn.js';

function Menu({ label, buttonClassName, button, children }) {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={buttonClassName}
        onClick={() => setOpen((value) => !value)}
      >
        {typeof button === 'function' ? button(open) : button}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-2 min-w-[12.5rem] rounded-xl border border-light bg-card py-2 shadow-spark-lg"
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      ) : null}
    </div>
  );
}

function Item({ icon, children, onClick, tone }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2.5 px-5 py-2 text-left text-[0.85rem] font-semibold text-main transition duration-200 ease-in-out hover:bg-canvas hover:text-forest-medium',
        tone === 'danger' && 'text-sys-red hover:bg-sys-red-bg hover:text-sys-red',
      )}
      onClick={onClick}
    >
      <i className={cn(icon, 'text-[0.95rem] text-muted-green', tone === 'danger' && 'text-sys-red')} />
      {children}
    </button>
  );
}

export default function AdminNavbar({ collapsed, isDesktop, onToggleCollapse, onToggleMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.name || 'A').trim().charAt(0).toUpperCase();

  async function onLogout() {
    try {
      await logout();
      navigate('/login');
    } catch {
      // Toast is raised in AuthContext.
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    document.documentElement.requestFullscreen?.();
  }

  const iconButton =
    'inline-flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-light bg-card text-[1.15rem] text-main shadow-spark-sm transition duration-200 ease-in-out hover:bg-surface-hover hover:text-forest-medium';

  return (
    <header
      className={cn(
        'sticky top-0 z-[1000] mb-8 flex flex-wrap items-center gap-3 border-b border-subtle bg-navbar px-6 py-4 backdrop-blur-[12px]',
        'min-[992px]:grid min-[992px]:grid-cols-[1fr_minmax(0,30rem)_1fr] min-[992px]:gap-6 min-[992px]:px-10 min-[992px]:py-5',
      )}
    >
      <div className="flex items-center gap-3">
        {isDesktop ? (
          <button
            type="button"
            className={iconButton}
            aria-label={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            onClick={onToggleCollapse}
          >
            <i className={cn('bi', collapsed ? 'bi-chevron-bar-right' : 'bi-chevron-bar-left')} />
          </button>
        ) : (
          <button
            type="button"
            className={iconButton}
            aria-label="Toggle navigation"
            onClick={onToggleMobile}
          >
            <i className="bi bi-list text-[1.2rem]" />
          </button>
        )}

        <Menu
          label="Create"
          buttonClassName="inline-flex items-center gap-2 rounded-lg bg-forest-medium px-4 py-2 text-[0.825rem] font-bold text-white shadow-spark-sm transition duration-200 ease-in-out hover:bg-forest-dark"
          button={
            <>
              <i className="bi bi-plus-lg text-[0.85rem]" />
              <span>Create</span>
            </>
          }
        >
          {(close) => (
            <>
              <p className="px-5 pb-1 pt-2 text-[0.725rem] font-bold uppercase tracking-[0.06em] text-muted-green">
                Quick actions
              </p>
              <Link
                role="menuitem"
                to="/admin/products"
                className="flex items-center gap-2.5 px-5 py-2 text-[0.85rem] font-semibold text-main hover:bg-canvas"
                onClick={close}
              >
                <i className="bi bi-box-seam text-muted-green" />
                New product
              </Link>
              <Link
                role="menuitem"
                to="/admin/categories"
                className="flex items-center gap-2.5 px-5 py-2 text-[0.85rem] font-semibold text-main hover:bg-canvas"
                onClick={close}
              >
                <i className="bi bi-tags text-muted-green" />
                New category
              </Link>
            </>
          )}
        </Menu>
      </div>

      <form className="relative order-3 w-full min-[992px]:order-none min-[992px]:w-auto" onSubmit={(event) => event.preventDefault()}>
        <input
          type="search"
          placeholder="Search anything in Spark..."
          aria-label="Search"
          className="w-full rounded-full border border-light bg-card py-2.5 pl-5 pr-11 text-sm font-medium text-main shadow-spark-sm outline-none transition duration-200 ease-in-out placeholder:text-placeholder focus:border-forest-medium focus:shadow-focus"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-green"
        >
          <i className="bi bi-search" />
        </button>
      </form>

      <div className="ml-auto flex items-center gap-3 min-[992px]:ml-0 min-[992px]:justify-end">
        <button type="button" className={iconButton} aria-label="Toggle fullscreen" onClick={toggleFullscreen}>
          <i className="bi bi-arrows-fullscreen" />
        </button>

        <Menu
          label="Notifications"
          buttonClassName={cn(iconButton, 'relative')}
          button={
            <>
              <i className="bi bi-bell" />
              <span className="absolute -right-0.5 -top-0.5 h-[11px] w-[11px] rounded-full border-2 border-card bg-sys-green" />
            </>
          }
        >
          {() => (
            <div className="w-[18rem]">
              <div className="flex items-center justify-between border-b border-light px-5 py-4">
                <h2 className="text-sm font-bold text-main">Notifications</h2>
              </div>
              <p className="px-5 py-6 text-sm text-muted-green">No notifications yet.</p>
            </div>
          )}
        </Menu>

        <Menu
          label="Account menu"
          buttonClassName="inline-flex items-center gap-2.5 rounded-lg px-1 py-1 transition duration-200 ease-in-out hover:bg-canvas"
          button={(open) => (
            <>
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-forest-medium text-sm font-bold text-white">
                {initial}
              </span>
              <span className="hidden text-sm font-bold text-main md:inline">{user?.name || 'Administrator'}</span>
              <i className={cn('bi bi-chevron-down text-xs text-muted-green transition duration-200', open && 'rotate-180')} />
            </>
          )}
        >
          {(close) => (
            <>
              <p className="px-5 pb-1 pt-2 text-[0.725rem] font-bold uppercase tracking-[0.06em] text-muted-green">
                Welcome
              </p>
              <Item
                icon="bi bi-shop"
                onClick={() => {
                  close();
                  navigate('/');
                }}
              >
                Storefront
              </Item>
              <Item
                icon="bi bi-box-arrow-right"
                tone="danger"
                onClick={() => {
                  close();
                  onLogout();
                }}
              >
                Logout
              </Item>
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}
