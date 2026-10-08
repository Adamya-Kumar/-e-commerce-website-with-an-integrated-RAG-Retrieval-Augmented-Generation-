import { Link, NavLink } from 'react-router-dom';
import BrandMark from '../brand/BrandMark.jsx';
import { cn } from '../ui/cn.js';

const SECTIONS = [
  {
    title: 'Menu',
    items: [
      { to: '/admin', label: 'Dashboard', icon: 'bi bi-grid-fill', end: true },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/admin/products', label: 'Products', icon: 'bi bi-box-seam' },
      { to: '/admin/categories', label: 'Categories', icon: 'bi bi-tags' },
    ],
  },
  {
    title: 'Sales',
    items: [{ to: '/admin/orders', label: 'Orders', icon: 'bi bi-receipt' }],
  },
];

export default function AdminSidebar({
  user,
  collapsed,
  mobileOpen,
  isDesktop,
  onNavigate,
}) {
  const iconOnly = isDesktop && collapsed;
  const initial = (user?.name || 'A').trim().charAt(0).toUpperCase();

  return (
    <aside
      id="sidebar"
      className={cn(
        'fixed bottom-0 left-0 top-0 z-[1030] flex w-sidebar flex-col overflow-y-auto border-r border-dark-green bg-forest-dark px-6 py-8',
        'transition-transform duration-300 ease-drawer',
        isDesktop
          ? cn('translate-x-0', collapsed && 'w-sidebar-collapsed items-center px-3')
          : mobileOpen
            ? 'translate-x-0 shadow-spark-lg'
            : '-translate-x-full',
      )}
    >
      <Link
        to="/admin"
        className={cn(
          'mb-10 flex items-center gap-3 pl-2 text-[1.35rem] font-bold text-white',
          iconOnly && 'w-full justify-center pl-0',
        )}
        onClick={onNavigate}
      >
        <BrandMark className="h-8 w-8" />
        <span className={cn(iconOnly && 'hidden')}>Spark Admin</span>
      </Link>

      <div className="min-h-0 flex-1">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-7">
            <div
              className={cn(
                'mb-3 pl-3 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-sidebar-muted opacity-60',
                iconOnly && 'hidden',
              )}
            >
              {section.title}
            </div>
            <ul>
              {section.items.map((item) => (
                <li key={item.to} className="mb-1.5">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    title={item.label}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 rounded-md px-3.5 py-3 text-[0.95rem] font-medium text-sidebar-muted transition duration-200 ease-in-out hover:bg-sidebar-hover hover:text-white',
                        iconOnly && 'justify-center px-3',
                        isActive && 'bg-sidebar-active font-semibold text-white [&_i]:text-lime',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? (
                          <span
                            className={cn(
                              'absolute top-[15%] h-[70%] w-1 rounded-r bg-lime',
                              iconOnly ? '-left-3' : '-left-6',
                            )}
                          />
                        ) : null}
                        <i className={cn(item.icon, 'text-[1.15rem]', iconOnly && 'text-[1.35rem]')} />
                        <span className={cn(iconOnly && 'hidden')}>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        className={cn(
          'mt-auto flex items-center gap-3 rounded-xl border border-dark-green bg-sidebar-hover p-3.5 text-white',
          iconOnly && 'justify-center border-transparent bg-transparent p-2',
        )}
      >
        <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-forest-medium text-sm font-bold">
          {initial}
        </span>
        <div className={cn('min-w-0 flex-1', iconOnly && 'hidden')}>
          <div className="truncate text-sm font-semibold">{user?.name || 'Administrator'}</div>
          <div className="truncate text-xs text-sidebar-muted opacity-80">{user?.email}</div>
        </div>
      </div>
    </aside>
  );
}
