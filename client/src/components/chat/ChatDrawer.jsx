import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { useCart } from '../../context/useCart.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import Button from '../ui/Button.jsx';
import Composer from './Composer.jsx';
import MessageList from './MessageList.jsx';
import SuggestedPrompts from './SuggestedPrompts.jsx';
import { useChatStream } from './useChatStream.js';

function getPageType(pathname) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/products/')) return 'product_detail';
  if (pathname === '/cart') return 'cart';
  if (pathname.startsWith('/account')) return 'orders';
  return 'generic';
}

export default function ChatDrawer({ open, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { user } = useAuth();
  const { count } = useCart();

  const pageContext = useMemo(() => {
    const path = location.pathname;
    const pathParts = path.split('/');
    const slug = pathParts[pathParts.length - 1] && path.startsWith('/products/') ? pathParts[pathParts.length - 1] : '';

    return {
      path,
      page_type: getPageType(path),
      slug,
      cart_count: count,
    };
  }, [count, location.pathname]);

  const { messages, isStreaming, pendingAction, error, sendMessage, confirmAction, setPendingAction } = useChatStream({
    open,
    user,
    pageContext,
  });

  useEffect(() => {
    if (!open || !drawerRef.current) return undefined;

    const focusable = drawerRef.current.querySelectorAll(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (first) {
      first.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current || isDesktop) {
        return;
      }

      const active = document.activeElement;
      if (!active) {
        event.preventDefault();
        first?.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last?.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, onClose, open]);

  function handleSubmit(value) {
    if (!value.trim()) return;
    sendMessage(value);
  }

  function handleLoginPrompt() {
    const redirect = `${location.pathname}${location.search}`;
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-forest-dark/20 backdrop-blur-[1px] lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal={!isDesktop}
        aria-label="Shopping assistant"
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[420px] flex-col border-l border-forest-dark/10 bg-canvas shadow-spark-lg lg:max-w-none lg:w-drawer"
      >
        <header className="flex items-center justify-between border-b border-white/10 bg-forest-dark px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lime text-lg text-forest-medium">
              <i className="bi bi-stars" />
            </div>
            <div>
              <p className="text-sm font-semibold">Spark Assistant</p>
              <p className="text-[11px] text-white/70">Shopping help</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/80 transition hover:bg-white/5 hover:text-white" aria-label="Close chat">
            <i className="bi bi-x-lg" />
          </button>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-atomic="false">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white p-4 shadow-spark-sm">
                  <p className="text-sm font-semibold text-main">
                    {user?.name
                      ? `Hi ${user.name.trim().split(/\s+/)[0]}! How can I help you today?`
                      : 'Hi there! How can I help you today?'}
                  </p>
                </div>
                <SuggestedPrompts pageType={pageContext.page_type} onSelect={handleSubmit} />
              </div>
            ) : (
              <MessageList messages={messages} isStreaming={isStreaming} onConfirm={confirmAction} onDecline={() => confirmAction(false)} />
            )}

            {pendingAction && !user ? (
              <div className="mt-4 rounded-2xl border border-dashed border-forest-medium/40 bg-white p-4 shadow-spark-sm">
                <p className="text-sm font-semibold text-main">Please log in to continue.</p>
                <p className="mt-1 text-sm text-muted-green">That action needs an authenticated customer account.</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="accent" size="sm" onClick={handleLoginPrompt}>Log in</Button>
                  <Button variant="outline" size="sm" onClick={() => setPendingAction(null)}>Dismiss</Button>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-xl border border-sys-red/20 bg-sys-red-bg p-3 text-sm text-sys-red" role="alert">
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-light bg-white px-4 py-3">
            <Composer onSubmit={handleSubmit} disabled={isStreaming} />
          </div>
        </div>
      </aside>
    </>
  );
}
