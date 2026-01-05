'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useVibecheck } from '@/hooks/useVibecheck';
import { Button } from '@/components/ui/Button';

interface VibecheckBannerProps {
  className?: string;
}

export function VibecheckBanner({ className }: VibecheckBannerProps) {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';
  const {
    status,
    timeRemaining,
    hasPostedToday,
    formattedTimeRemaining,
    isLoading,
  } = useVibecheck();

  // Don't show banner if loading, waiting for vibecheck, or already posted
  if (isLoading || status === 'waiting' || status === 'closed' || hasPostedToday) {
    return null;
  }

  const isActive = status === 'active';
  const isLate = status === 'late';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'relative overflow-hidden rounded-xl p-4',
          isNeumorphic
            ? isActive
              ? 'bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200'
              : 'bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200'
            : isActive
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30'
            : 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30',
          className
        )}
      >
        {/* Pulsing background for active state */}
        {isActive && (
          <motion.div
            className={cn(
              'absolute inset-0 rounded-xl',
              isNeumorphic
                ? 'bg-green-200/50'
                : 'bg-green-500/10'
            )}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isActive ? (
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-2xl"
                >
                  ⚡
                </motion.span>
              ) : (
                <span className="text-2xl">⏰</span>
              )}

              <h3
                className={cn(
                  'font-bold text-lg',
                  isNeumorphic
                    ? isActive
                      ? 'text-green-800'
                      : 'text-orange-800'
                    : isActive
                    ? 'text-green-300'
                    : 'text-orange-300'
                )}
              >
                {isActive ? 'VibeCheck Time!' : 'Running Late...'}
              </h3>
            </div>

            <p
              className={cn(
                'text-sm mt-1',
                isNeumorphic
                  ? isActive
                    ? 'text-green-700'
                    : 'text-orange-700'
                  : isActive
                  ? 'text-green-400/80'
                  : 'text-orange-400/80'
              )}
            >
              {isActive
                ? "It's time to capture your vibe! Show us what you're working on."
                : "You're posting late, but better late than never!"}
            </p>

            {isActive && timeRemaining !== null && (
              <div
                className={cn(
                  'mt-2 flex items-center gap-2 text-sm font-mono',
                  isNeumorphic ? 'text-green-600' : 'text-green-400'
                )}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{formattedTimeRemaining} remaining</span>
              </div>
            )}
          </div>

          <Link href="/capture">
            <Button
              variant={isNeumorphic ? 'glass' : 'gradient'}
              size="md"
              className={cn(
                isActive && !isNeumorphic && 'animate-pulse'
              )}
            >
              {isActive ? 'Post Now' : 'Post Late'}
            </Button>
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
