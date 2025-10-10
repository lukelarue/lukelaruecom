import type { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar/Sidebar';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-80 border-l border-slate-800 bg-slate-900 order-2">
        <Sidebar />
      </aside>
      <main className="flex-1 px-6 py-8 order-1">{children}</main>
    </div>
  );
};
