import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar/Sidebar';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const [chatVisible, setChatVisible] = useState(true);

  return (
    <div className="h-screen overflow-hidden bg-zinc-950 text-zinc-100 flex">
      <main className="flex-1 px-6 py-4 order-1 overflow-y-auto">{children}</main>
      <aside
        className={`border-l border-zinc-800 bg-zinc-900 order-2 transition-all duration-300 flex flex-col ${
          chatVisible ? 'w-80' : 'w-0'
        }`}
      >
        {chatVisible && <Sidebar />}
      </aside>
      <button
        type="button"
        onClick={() => setChatVisible((prev) => !prev)}
        className="fixed right-0 top-1/2 z-50 -translate-y-1/2 rounded-l-lg border border-r-0 border-zinc-700 bg-zinc-800 px-1.5 py-3 text-xs text-zinc-300 transition hover:bg-zinc-700"
        aria-label={chatVisible ? 'Hide chat' : 'Show chat'}
      >
        {chatVisible ? '›' : '‹'}
      </button>
    </div>
  );
};

export const MainLayoutRoute = () => {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};
