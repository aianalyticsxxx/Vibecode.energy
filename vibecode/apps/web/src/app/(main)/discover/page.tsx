'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useDiscoveryFeed } from '@/hooks/useDiscoveryFeed';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { VibeCard } from '@/components/feed/VibeCard';
import { VibecheckBanner } from '@/components/vibecheck/VibecheckBanner';

type SortOption = 'recent' | 'popular';

export default function DiscoverPage() {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';
  const [sort, setSort] = useState<SortOption>('recent');
  const { vibes, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useDiscoveryFeed(sort);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassPanel padding="md">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className={cn(
                  'text-2xl font-bold',
                  isNeumorphic ? 'text-neumorphic-text' : 'text-white'
                )}
              >
                Discover
              </h1>
              <p
                className={cn(
                  'text-sm',
                  isNeumorphic ? 'text-neumorphic-text-secondary' : 'text-white/50'
                )}
              >
                Explore vibes from all coders
              </p>
            </div>

            {/* Sort toggle */}
            <div
              className={cn(
                'flex rounded-lg p-1',
                isNeumorphic
                  ? 'bg-neumorphic-bg-dark'
                  : 'bg-white/10'
              )}
            >
              <button
                onClick={() => setSort('recent')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  sort === 'recent'
                    ? isNeumorphic
                      ? 'bg-neumorphic-bg text-neumorphic-text shadow-neu-sm'
                      : 'bg-white/20 text-white'
                    : isNeumorphic
                    ? 'text-neumorphic-text-secondary hover:text-neumorphic-text'
                    : 'text-white/50 hover:text-white'
                )}
              >
                Recent
              </button>
              <button
                onClick={() => setSort('popular')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  sort === 'popular'
                    ? isNeumorphic
                      ? 'bg-neumorphic-bg text-neumorphic-text shadow-neu-sm'
                      : 'bg-white/20 text-white'
                    : isNeumorphic
                    ? 'text-neumorphic-text-secondary hover:text-neumorphic-text'
                    : 'text-white/50 hover:text-white'
                )}
              >
                Popular
              </button>
            </div>
          </div>
        </GlassPanel>
      </motion.div>

      {/* VibeCheck Banner */}
      <VibecheckBanner />

      {/* Vibes Feed */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <GlassPanel key={i} className="animate-pulse" padding="none">
              <div className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/10" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                  <div className="h-3 w-24 bg-white/10 rounded" />
                </div>
              </div>
              <div className="aspect-square bg-white/10" />
              <div className="p-4">
                <div className="h-4 w-48 bg-white/10 rounded" />
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : vibes.length === 0 ? (
        <GlassPanel className="text-center" padding="lg">
          <div className="text-5xl mb-4">🌍</div>
          <h2
            className={cn(
              'text-xl font-semibold mb-2',
              isNeumorphic ? 'text-neumorphic-text' : 'text-white'
            )}
          >
            No vibes yet
          </h2>
          <p
            className={cn(
              isNeumorphic ? 'text-neumorphic-text-secondary' : 'text-white/60'
            )}
          >
            Be the first to share your vibecoding moment!
          </p>
        </GlassPanel>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
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
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div
                  className={cn(
                    'w-6 h-6 border-2 border-t-transparent rounded-full animate-spin',
                    isNeumorphic
                      ? 'border-neumorphic-accent'
                      : 'border-vibe-purple-light'
                  )}
                />
              </div>
            )}
          </div>

          {!hasNextPage && vibes.length > 0 && (
            <p
              className={cn(
                'text-center text-sm py-4',
                isNeumorphic ? 'text-neumorphic-text-secondary' : 'text-white/40'
              )}
            >
              You've seen all the vibes!
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
