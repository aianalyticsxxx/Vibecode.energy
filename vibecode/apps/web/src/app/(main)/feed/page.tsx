'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { VibeFeed } from '@/components/feed/VibeFeed';
import { CaptureGate } from '@/components/capture/CaptureGate';
import { VibePulse } from '@/components/presence/VibePulse';
import { DashboardLayout, StatsPanel, TrendingPanel, ActivityFeed } from '@/components/dashboard';
import { useAuth } from '@/hooks/useAuth';

type FeedTab = 'explore' | 'following';

export default function FeedPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>('explore');

  const sidebar = (
    <>
      <StatsPanel
        username={user?.username}
        streak={7}
        totalPosts={23}
        totalSparkles={142}
        rank={42}
      />
      <TrendingPanel />
      <ActivityFeed />
    </>
  );

  return (
    <CaptureGate>
      <DashboardLayout sidebar={sidebar}>
        <div className="space-y-5">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-xl font-semibold text-terminal-text">
                Feed
              </h1>
              <p className="text-sm text-terminal-text-secondary">
                See what everyone&apos;s building
              </p>
            </div>

            {/* Terminal-style cursor logo */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-mono text-lg text-terminal-accent">&gt;_</span>
              <span className="font-semibold text-terminal-text">OneShotCoding</span>
            </div>
          </motion.div>

          {/* Terminal-style Tab Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('explore')}
              className={`
                font-mono text-sm py-2 px-4 rounded-md border transition-all
                ${activeTab === 'explore'
                  ? 'bg-terminal-accent/10 border-terminal-accent text-terminal-accent'
                  : 'bg-terminal-bg-elevated border-terminal-border text-terminal-text-secondary hover:text-terminal-text hover:border-terminal-border-bright'
                }
              `}
            >
              ./explore
            </button>
            {user && (
              <button
                onClick={() => setActiveTab('following')}
                className={`
                  font-mono text-sm py-2 px-4 rounded-md border transition-all
                  ${activeTab === 'following'
                    ? 'bg-terminal-accent/10 border-terminal-accent text-terminal-accent'
                    : 'bg-terminal-bg-elevated border-terminal-border text-terminal-text-secondary hover:text-terminal-text hover:border-terminal-border-bright'
                  }
                `}
              >
                ./following
              </button>
            )}
            <Link
              href="/challenges"
              className="font-mono text-sm py-2 px-4 rounded-md border transition-all
                         bg-terminal-bg-elevated border-terminal-border text-terminal-text-secondary
                         hover:text-terminal-text hover:border-terminal-border-bright"
            >
              ./challenges
            </Link>
          </div>

          {/* Feed */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <VibeFeed feedType={activeTab === 'explore' ? 'everyone' : 'following'} />
          </motion.div>
        </div>
      </DashboardLayout>

      {/* Floating Vibe Pulse - shows online friends */}
      <VibePulse />
    </CaptureGate>
  );
}
