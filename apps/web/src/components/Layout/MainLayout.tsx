import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar/Sidebar';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <aside className="w-80 border-l border-zinc-800 bg-zinc-900 order-2">
        <Sidebar />
      </aside>
      <main className="flex-1 px-6 py-8 order-1">{children}</main>
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
