'use client';

import { motion } from 'framer-motion';

interface StatsPanelProps {
  streak?: number;
  totalPosts?: number;
  totalSparkles?: number;
  rank?: number;
  username?: string;
}

export function StatsPanel({
  streak = 0,
  totalPosts = 0,
  totalSparkles = 0,
  rank,
  username,
}: StatsPanelProps) {
  const stats = [
    { label: 'streak', value: streak, suffix: streak > 0 ? ' days' : '', highlight: streak >= 7 },
    { label: 'posts', value: totalPosts, suffix: '' },
    { label: 'sparkles', value: totalSparkles, suffix: '' },
    ...(rank ? [{ label: 'rank', value: rank, prefix: '#', suffix: '' }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-terminal-bg-elevated px-4 py-2.5 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-error/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-warning/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-success/60" />
          </div>
          <span className="font-mono text-xs text-terminal-text-secondary">
            {username ? `@${username}` : 'your'} ~ stats
          </span>
        </div>
      </div>

      {/* Stats Body */}
      <div className="p-4 space-y-2">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="flex items-center justify-between font-mono text-sm"
          >
            <span className="text-terminal-text-dim">{stat.label}:</span>
            <span className={stat.highlight ? 'text-terminal-accent' : 'text-terminal-text'}>
              {stat.prefix || ''}{stat.value.toLocaleString()}{stat.suffix}
              {stat.label === 'streak' && streak >= 7 && (
                <span className="ml-1">
                  {streak >= 100 ? '💯' : streak >= 50 ? '🌟' : streak >= 30 ? '⭐' : streak >= 14 ? '💪' : '🔥'}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
