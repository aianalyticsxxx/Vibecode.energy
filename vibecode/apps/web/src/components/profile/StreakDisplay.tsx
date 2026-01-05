'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import type { UserStreak } from '@/lib/api';

interface StreakDisplayProps {
  streak: UserStreak;
  size?: 'sm' | 'md' | 'lg';
  showMilestone?: boolean;
  showNextMilestone?: boolean;
  className?: string;
}

export function StreakDisplay({
  streak,
  size = 'md',
  showMilestone = true,
  showNextMilestone = false,
  className,
}: StreakDisplayProps) {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  const sizeClasses = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-1.5',
    lg: 'text-lg gap-2',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const hasStreak = streak.currentStreak > 0;

  return (
    <div className={cn('flex flex-col', className)}>
      <div className={cn('flex items-center', sizeClasses[size])}>
        {hasStreak ? (
          <motion.span
            className={iconSizes[size]}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            🔥
          </motion.span>
        ) : (
          <span className={cn(iconSizes[size], 'opacity-50')}>💤</span>
        )}

        <span
          className={cn(
            'font-bold',
            isNeumorphic ? 'text-neumorphic-text' : 'text-white'
          )}
        >
          {streak.currentStreak}
        </span>

        <span
          className={cn(
            'font-medium',
            isNeumorphic ? 'text-neumorphic-text-secondary' : 'text-white/60'
          )}
        >
          {streak.currentStreak === 1 ? 'day' : 'days'}
        </span>

        {showMilestone && streak.milestone && (
          <span
            className={cn(
              'ml-1 px-2 py-0.5 rounded-full text-xs font-medium',
              isNeumorphic
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-yellow-500/20 text-yellow-300'
            )}
          >
            {streak.milestone.emoji} {streak.milestone.name}
          </span>
        )}
      </div>

      {showNextMilestone && streak.nextMilestone && (
        <div
          className={cn(
            'text-xs mt-1',
            isNeumorphic ? 'text-neumorphic-text-secondary' : 'text-white/40'
          )}
        >
          {streak.nextMilestone.daysRemaining} days to {streak.nextMilestone.emoji}{' '}
          {streak.nextMilestone.name}
        </div>
      )}

      {streak.longestStreak > streak.currentStreak && (
        <div
          className={cn(
            'text-xs mt-0.5',
            isNeumorphic ? 'text-neumorphic-text-secondary' : 'text-white/40'
          )}
        >
          Best: {streak.longestStreak} days
        </div>
      )}
    </div>
  );
}
