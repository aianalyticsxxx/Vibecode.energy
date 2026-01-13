'use client';

import { useAuth } from '@/hooks/useAuth';

export interface CaptureGateProps {
  children: React.ReactNode;
}

/**
 * Simple gate that shows loading while auth is resolving.
 * No longer enforces daily posting - users can post anytime.
 */
export function CaptureGate({ children }: CaptureGateProps) {
  const { isLoading: authLoading } = useAuth();

  // Show loading while auth is resolving
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
