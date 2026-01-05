'use client';

import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

interface LateBadgeProps {
  lateByMinutes: number;
  className?: string;
}

function formatLateTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m late`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h late`;
  }

  return `${hours}h ${remainingMinutes}m late`;
}

export function LateBadge({ lateByMinutes, className }: LateBadgeProps) {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  if (lateByMinutes <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        isNeumorphic
          ? 'bg-orange-100 text-orange-700 border border-orange-200'
          : 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
        className
      )}
    >
      <svg
        className="w-3 h-3"
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
      {formatLateTime(lateByMinutes)}
    </span>
  );
}
