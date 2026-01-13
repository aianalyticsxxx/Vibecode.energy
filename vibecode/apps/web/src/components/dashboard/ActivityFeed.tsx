'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'post' | 'sparkle' | 'follow';
  username: string;
  timestamp: Date;
  targetUser?: string;
}

interface ActivityFeedProps {
  items?: ActivityItem[];
}

const defaultItems: ActivityItem[] = [
  { id: '1', type: 'post', username: 'sarah', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { id: '2', type: 'sparkle', username: 'mike', timestamp: new Date(Date.now() - 1000 * 60 * 12), targetUser: 'you' },
  { id: '3', type: 'post', username: 'alex', timestamp: new Date(Date.now() - 1000 * 60 * 25) },
  { id: '4', type: 'follow', username: 'jordan', timestamp: new Date(Date.now() - 1000 * 60 * 45), targetUser: 'you' },
  { id: '5', type: 'sparkle', username: 'casey', timestamp: new Date(Date.now() - 1000 * 60 * 60), targetUser: 'sarah' },
];

function getActivityText(item: ActivityItem): string {
  switch (item.type) {
    case 'post':
      return 'shipped a build';
    case 'sparkle':
      return item.targetUser === 'you' ? 'sparked your post' : `sparked @${item.targetUser}`;
    case 'follow':
      return 'followed you';
    default:
      return '';
  }
}

function getActivityIcon(type: ActivityItem['type']): string {
  switch (type) {
    case 'post':
      return '→';
    case 'sparkle':
      return '✨';
    case 'follow':
      return '+';
    default:
      return '•';
  }
}

export function ActivityFeed({ items = defaultItems }: ActivityFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
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
            activity ~ ./recent
          </span>
        </div>
      </div>

      {/* Activity Items */}
      <div className="p-3 space-y-0.5 max-h-64 overflow-y-auto scrollbar-terminal">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 py-1.5 px-2 rounded-md text-sm font-mono"
          >
            <span className="text-terminal-accent flex-shrink-0 w-4">
              {getActivityIcon(item.type)}
            </span>
            <div className="flex-1 min-w-0">
              <Link
                href={`/profile/${item.username}`}
                className="text-terminal-text hover:text-terminal-accent transition-colors"
              >
                @{item.username}
              </Link>
              <span className="text-terminal-text-secondary ml-1">
                {getActivityText(item)}
              </span>
            </div>
            <span className="text-terminal-text-dim text-xs flex-shrink-0">
              {formatRelativeTime(item.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
