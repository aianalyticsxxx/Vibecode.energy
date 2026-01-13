'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface TrendingItem {
  tag: string;
  count: number;
}

interface TrendingPanelProps {
  items?: TrendingItem[];
}

const defaultItems: TrendingItem[] = [
  { tag: 'buildinpublic', count: 142 },
  { tag: 'frontend', count: 98 },
  { tag: 'typescript', count: 76 },
  { tag: 'react', count: 64 },
  { tag: 'ai', count: 52 },
];

export function TrendingPanel({ items = defaultItems }: TrendingPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
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
            trending ~ ./tags
          </span>
        </div>
      </div>

      {/* Trending Items */}
      <div className="p-3 space-y-1">
        {items.map((item, index) => (
          <Link
            key={item.tag}
            href={`/discover?tag=${item.tag}`}
            className="flex items-center justify-between py-1.5 px-2 rounded-md
                       hover:bg-terminal-bg-hover transition-colors group"
          >
            <span className="font-mono text-sm">
              <span className="text-terminal-accent">#</span>
              <span className="text-terminal-text group-hover:text-terminal-accent transition-colors">
                {item.tag}
              </span>
            </span>
            <span className="font-mono text-xs text-terminal-text-dim">
              {item.count}
            </span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
