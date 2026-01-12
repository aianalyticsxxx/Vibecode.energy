'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { VibeFeed } from '@/components/feed/VibeFeed';
import { CaptureGate } from '@/components/capture/CaptureGate';
import { VibecheckBanner } from '@/components/vibecheck/VibecheckBanner';
import { VibePulse } from '@/components/presence/VibePulse';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type FeedTab = 'everyone' | 'following';

export default function FeedPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isNeumorphic = theme === 'neumorphic';
  const [activeTab, setActiveTab] = useState<FeedTab>('everyone');

  return (
    <CaptureGate>
      <div className="max-w-2xl mx-auto space-y-6">
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

        {/* Feed Tabs - only show if logged in */}
        {user && (
          <div className="flex justify-center">
            <div className={cn(
              "inline-flex rounded-full p-1",
              isNeumorphic
                ? "bg-neumorphic-bg shadow-neumorphic-inset"
                : "bg-glass-white backdrop-blur-glass border border-glass-border"
            )}>
              <button
                onClick={() => setActiveTab('everyone')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  activeTab === 'everyone'
                    ? isNeumorphic
                      ? "bg-neumorphic-bg shadow-neumorphic-sm text-neumorphic-text"
                      : "bg-vibe-purple text-white"
                    : isNeumorphic
                      ? "text-neumorphic-text-secondary hover:text-neumorphic-text"
                      : "text-white/60 hover:text-white"
                )}
              >
                Everyone
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  activeTab === 'following'
                    ? isNeumorphic
                      ? "bg-neumorphic-bg shadow-neumorphic-sm text-neumorphic-text"
                      : "bg-vibe-purple text-white"
                    : isNeumorphic
                      ? "text-neumorphic-text-secondary hover:text-neumorphic-text"
                      : "text-white/60 hover:text-white"
                )}
              >
                Following
              </button>
            </div>
          </div>
        )}

        {/* VibeCheck Banner - shows when it's time to post */}
        <VibecheckBanner />

        {/* Feed */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <VibeFeed feedType={activeTab} />
        </motion.div>
      </div>

      {/* Floating Vibe Pulse - shows online friends */}
      <VibePulse />
    </CaptureGate>
  );
}
