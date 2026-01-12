'use client';

import { useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useVibes } from '@/hooks/useVibes';
import { useFollowingFeed } from '@/hooks/useFollowingFeed';
import { VibeCard } from './VibeCard';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useTheme } from '@/hooks/useTheme';

export interface VibeFeedProps {
  className?: string;
  feedType?: 'everyone' | 'following';
}

export function VibeFeed({ className, feedType = 'everyone' }: VibeFeedProps) {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  const everyoneFeed = useVibes();
  const followingFeed = useFollowingFeed();

  const activeFeed = feedType === 'following' ? followingFeed : everyoneFeed;

  const {
    vibes,
    isLoading,
    isLoadingMore,
    isRefetching,
    hasMore,
    error,
    loadMore,
    refetch,
  } = activeFeed;

  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
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
    const element = loadMoreRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  if (isLoading && vibes.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(3)].map((_, i) => (
          <GlassPanel key={i} className="animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("w-10 h-10 rounded-full", isNeumorphic ? "bg-neumorphic-dark/20" : "bg-white/10")} />
              <div className="flex-1">
                <div className={cn("h-4 w-24 rounded mb-1", isNeumorphic ? "bg-neumorphic-dark/20" : "bg-white/10")} />
                <div className={cn("h-3 w-16 rounded", isNeumorphic ? "bg-neumorphic-dark/20" : "bg-white/10")} />
              </div>
            </div>
            <div className={cn("aspect-video rounded-xl", isNeumorphic ? "bg-neumorphic-dark/20" : "bg-white/10")} />
          </GlassPanel>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <GlassPanel className={cn('text-center py-12', className)}>
        <div className="text-4xl mb-4">😔</div>
        <h3 className={cn("text-xl font-semibold mb-2", isNeumorphic ? "text-neumorphic-text" : "text-white")}>
          Something went wrong
        </h3>
        <p className={cn("mb-4", isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60")}>{error}</p>
        <button
          onClick={() => refetch()}
          className="text-vibe-purple hover:text-vibe-purple-light transition-colors"
        >
          Try again
        </button>
      </GlassPanel>
    );
  }

  if (vibes.length === 0) {
    return (
      <GlassPanel className={cn('text-center py-12', className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-4xl mb-4">{feedType === 'following' ? '👋' : '✨'}</div>
          <h3 className={cn("text-xl font-semibold mb-2", isNeumorphic ? "text-neumorphic-text" : "text-white")}>
            {feedType === 'following' ? 'No vibes from friends yet' : 'No vibes yet'}
          </h3>
          <p className={isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"}>
            {feedType === 'following'
              ? 'Follow some vibers to see their posts here!'
              : 'Be the first to share your vibe!'}
          </p>
        </motion.div>
      </GlassPanel>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Refresh button */}
      <div className="flex justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => refetch()}
          disabled={isRefetching}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all",
            isNeumorphic
              ? "bg-neumorphic-bg shadow-neumorphic-sm text-neumorphic-text hover:shadow-neumorphic-inset"
              : "bg-glass-white backdrop-blur-glass border border-glass-border text-white/80 hover:text-white hover:bg-white/20"
          )}
        >
          <motion.svg
            animate={isRefetching ? { rotate: 360 } : {}}
            transition={isRefetching ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </motion.svg>
          {isRefetching ? 'Refreshing...' : 'Refresh feed'}
        </motion.button>
      </div>

      <AnimatePresence mode="popLayout">
        {vibes.map((vibe, index) => (
          <motion.div
            key={vibe.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <VibeCard vibe={vibe} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isLoadingMore && (
          <div className="w-6 h-6 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
        )}
        {!hasMore && vibes.length > 0 && (
          <p className={cn("text-sm", isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/40")}>
            You&apos;ve seen all the vibes
          </p>
        )}
      </div>
    </div>
  );
}
