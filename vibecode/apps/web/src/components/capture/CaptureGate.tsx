'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDailyVibe } from '@/hooks/useDailyVibe';
import { useAuth } from '@/hooks/useAuth';

export interface CaptureGateProps {
  children: React.ReactNode;
}

/**
 * HOC that enforces capture-first behavior
 * Redirects to /capture if user hasn't posted their daily vibe
 */
export function CaptureGate({ children }: CaptureGateProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { hasPostedToday, isLoading: vibeLoading } = useDailyVibe();

  useEffect(() => {
    // Wait for both auth and vibe status to load
    if (authLoading || vibeLoading) return;

    // If not authenticated, let the auth flow handle it
    if (!user) return;

    // If user hasn't posted today, redirect to capture
    if (!hasPostedToday) {
      router.replace('/capture');
    }
  }, [user, authLoading, hasPostedToday, vibeLoading, router]);

  // Show nothing while loading
  if (authLoading || vibeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If no user, render children (let page handle auth redirect)
  if (!user) {
    return <>{children}</>;
  }

  // If user hasn't posted, show loading while redirecting
  if (!hasPostedToday) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">✨</div>
          <p className="text-white/70">Share your vibe first...</p>
        </div>
      </div>
    );
  }

  // User has posted, show content
  return <>{children}</>;
}
