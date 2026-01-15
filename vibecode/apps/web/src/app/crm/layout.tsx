'use client';

import { AdminAuthProvider } from '@/contexts/admin/AdminAuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import './globals.css';

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <div className="min-h-screen bg-[#09090B] text-white">
          {children}
        </div>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
