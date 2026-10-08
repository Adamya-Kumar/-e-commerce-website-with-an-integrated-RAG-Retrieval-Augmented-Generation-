import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ChatDrawer from '../components/chat/ChatDrawer.jsx';
import ChatFab from '../components/chat/ChatFab.jsx';
import StorefrontFooter from '../components/shop/StorefrontFooter.jsx';
import StorefrontNavbar from '../components/shop/StorefrontNavbar.jsx';

const chatbotEnabled = import.meta.env.VITE_CHATBOT_ENABLED === 'true';

export default function StorefrontLayout() {
  const [chatOpen, setChatOpen] = useState(false);
  const open = chatbotEnabled && chatOpen;

  return (
    <div
      className={`flex min-h-screen flex-col bg-canvas text-main transition-[margin-right] duration-300 ease-drawer ${
        open ? 'lg:mr-[var(--drawer-width)]' : ''
      }`}
    >
      <StorefrontNavbar
        chatOpen={open}
        chatEnabled={chatbotEnabled}
        onToggleChat={() => setChatOpen((current) => !current)}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <StorefrontFooter />
      {chatbotEnabled ? (
        <>
          <ChatFab open={open} onToggle={() => setChatOpen((current) => !current)} />
          <ChatDrawer open={open} onClose={() => setChatOpen(false)} />
        </>
      ) : null}
    </div>
  );
}
