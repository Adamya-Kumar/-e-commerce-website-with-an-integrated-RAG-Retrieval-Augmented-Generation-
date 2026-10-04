import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminNavbar from '../components/admin/AdminNavbar.jsx';
import AdminSidebar from '../components/admin/AdminSidebar.jsx';
import { useAuth } from '../context/useAuth.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';

const COLLAPSE_KEY = 'spark-sidebar-collapsed';

export default function AdminLayout() {
  const { user } = useAuth();
  const isDesktop = useMediaQuery('(min-width: 992px)');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  function toggleCollapse() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-canvas text-main">
      {!isDesktop && mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-[1025] bg-overlay backdrop-blur"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <AdminSidebar
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        isDesktop={isDesktop}
        onNavigate={() => setMobileOpen(false)}
      />
      <div
        className={
          isDesktop
            ? collapsed
              ? 'ml-sidebar-collapsed min-h-screen transition-[margin] duration-300 ease-drawer'
              : 'ml-sidebar min-h-screen transition-[margin] duration-300 ease-drawer'
            : 'min-h-screen'
        }
      >
        <AdminNavbar
          collapsed={collapsed}
          isDesktop={isDesktop}
          onToggleCollapse={toggleCollapse}
          onToggleMobile={() => setMobileOpen((open) => !open)}
        />
        <div className="px-6 pb-10 min-[992px]:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
