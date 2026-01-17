'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CaptureGate } from '@/components/capture/CaptureGate';
import { VibePulse } from '@/components/presence/VibePulse';
import { DashboardLayout, StatsPanel, TrendingPanel, ActivityFeed } from '@/components/dashboard';
import { FeedNavigation } from '@/components/feed/FeedNavigation';
import { VibeCard } from '@/components/feed/VibeCard';
import { useAuth } from '@/hooks/useAuth';
import { useFollowingFeed } from '@/hooks/useFollowingFeed';
import Link from 'next/link';

export default function FollowingFeedPage() {
  const { user } = useAuth();
  const { vibes, isLoading, isLoadingMore, hasMore, loadMore } = useFollowingFeed();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoadingMore) {
        loadMore();
      }
    },
    [hasMore, isLoadingMore, loadMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: '100px',
    });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  const sidebar = (
    <>
      <StatsPanel username={user?.username} />
      <TrendingPanel />
      <ActivityFeed mode="global" />
    </>
  );

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <CaptureGate>
        <DashboardLayout sidebar={sidebar}>
          <div className="space-y-5">
            <FeedNavigation />
            <div className="text-center py-12 bg-terminal-bg-elevated border border-terminal-border rounded-lg">
              <div className="text-4xl mb-4">🔒</div>
              <h2 className="text-lg font-mono text-terminal-text mb-2">
                Authentication required
              </h2>
              <p className="text-sm text-terminal-text-dim font-mono mb-4">
                // sign in to see shots from people you follow
              </p>
              <Link
                href="/auth/login"
                className="inline-block px-4 py-2 bg-terminal-accent text-terminal-bg font-mono text-sm rounded-lg hover:bg-terminal-accent/90 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </DashboardLayout>
        <VibePulse />
      </CaptureGate>
    );
  }

  return (
    <CaptureGate>
      <DashboardLayout sidebar={sidebar}>
        <div className="space-y-5">
          {/* Feed Navigation */}
          <FeedNavigation />

          {/* Terminal Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-2 font-mono text-terminal-text-dim text-xs">
              <span className="text-terminal-accent">$</span>
              <span>cd ~/feed/following</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-terminal-text font-mono">
                <span className="text-terminal-accent">&#62;</span> Following
              </h1>
              <p className="text-sm text-terminal-text-secondary font-mono">
                // shots from people you follow
              </p>
            </div>
          </motion.div>

          {/* Feed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-terminal-bg-elevated border border-terminal-border rounded-lg"
                  >
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-terminal-border" />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-terminal-border rounded mb-2" />
                        <div className="h-3 w-24 bg-terminal-border rounded" />
                      </div>
                    </div>
                    <div className="aspect-square bg-terminal-border" />
                  </div>
                ))}
              </div>
            ) : vibes.length === 0 ? (
              <div className="text-center py-12 bg-terminal-bg-elevated border border-terminal-border rounded-lg">
                <div className="text-4xl mb-4">{'◇'}</div>
                <h2 className="text-lg font-mono text-terminal-text mb-2">
                  No shots yet
                </h2>
                <p className="text-sm text-terminal-text-dim font-mono mb-4">
                  // follow some coders to see their shots here
                </p>
                <Link
                  href="/feed/explore"
                  className="inline-block px-4 py-2 bg-terminal-accent text-terminal-bg font-mono text-sm rounded-lg hover:bg-terminal-accent/90 transition-colors"
                >
                  Explore shots
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {vibes.map((vibe, index) => (
                  <motion.div
                    key={vibe.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                  >
                    <VibeCard vibe={vibe} />
                  </motion.div>
                ))}

                {/* Load more trigger */}
                <div ref={loadMoreRef} className="h-10">
                  {isLoadingMore && (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {!hasMore && vibes.length > 0 && (
                  <p className="text-center text-xs text-terminal-text-dim font-mono py-4">
                    // end of feed
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </DashboardLayout>

      <VibePulse />
    </CaptureGate>
  );
}
