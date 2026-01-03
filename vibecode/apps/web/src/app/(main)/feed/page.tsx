'use client';

import { motion } from 'framer-motion';
import { VibeFeed } from '@/components/feed/VibeFeed';
import { CaptureGate } from '@/components/capture/CaptureGate';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export default function FeedPage() {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  return (
    <CaptureGate>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className={cn(
            "text-2xl font-bold mb-2",
            isNeumorphic ? "text-neumorphic-text" : "text-white"
          )}>Vibe Feed</h1>
          <p className={isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"}>
            See what everyone&apos;s vibing
          </p>
        </motion.div>

        {/* Feed */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <VibeFeed />
        </motion.div>
      </div>
    </CaptureGate>
  );
}
