'use client';

import { useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useVibes } from '@/hooks/useVibes';
import { VibeCard } from './VibeCard';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useTheme } from '@/hooks/useTheme';

export interface VibeFeedProps {
  className?: string;
}

export function VibeFeed({ className }: VibeFeedProps) {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';
  const {
    vibes,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refetch,
  } = useVibes();

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
            <div className={cn("aspect-square rounded-xl", isNeumorphic ? "bg-neumorphic-dark/20" : "bg-white/10")} />
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
          <div className="text-4xl mb-4">✨</div>
          <h3 className={cn("text-xl font-semibold mb-2", isNeumorphic ? "text-neumorphic-text" : "text-white")}>No vibes yet</h3>
          <p className={isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"}>Be the first to share your vibe!</p>
        </motion.div>
      </GlassPanel>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
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
