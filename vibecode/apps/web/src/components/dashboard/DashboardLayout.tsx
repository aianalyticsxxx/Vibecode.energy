'use client';

import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  sidebarPosition?: 'left' | 'right';
}

export function DashboardLayout({
  children,
  sidebar,
  sidebarPosition = 'right',
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className={`
          flex flex-col lg:flex-row gap-6
          ${sidebarPosition === 'left' ? 'lg:flex-row-reverse' : ''}
        `}>
          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {children}
          </main>

          {/* Sidebar - Hidden on mobile, shown on lg+ */}
          {sidebar && (
            <aside className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-6 space-y-4">
                {sidebar}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
