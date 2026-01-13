'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useChallenges } from '@/hooks/useChallenges';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import type { Challenge } from '@/lib/api';

type FilterTab = 'active' | 'upcoming' | 'completed';

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  const getStatusBadge = () => {
    switch (challenge.status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            Active
          </span>
        );
      case 'voting':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
            Voting
          </span>
        );
      case 'upcoming':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
            Upcoming
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
            Completed
          </span>
        );
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link href={`/challenges/${challenge.id}`}>
      <GlassPanel className="hover:scale-[1.02] transition-transform cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {challenge.isOfficial && (
              <span className="text-yellow-400" title="Official Challenge">
                ⭐
              </span>
            )}
            {challenge.isSponsored && (
              <span className="text-purple-400" title="Sponsored">
                💎
              </span>
            )}
            <h3 className={cn(
              "font-semibold text-lg",
              isNeumorphic ? "text-neumorphic-text" : "text-white"
            )}>
              {challenge.title}
            </h3>
          </div>
          {getStatusBadge()}
        </div>

        {challenge.description && (
          <p className={cn(
            "text-sm mb-3 line-clamp-2",
            isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"
          )}>
            {challenge.description}
          </p>
        )}

        <div className={cn(
          "flex items-center gap-4 text-sm",
          isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/50"
        )}>
          <span>
            {formatDate(challenge.startsAt)} - {formatDate(challenge.endsAt)}
          </span>
          {challenge.prizeDescription && (
            <span className="text-yellow-400/80">
              🏆 {challenge.prizeDescription}
            </span>
          )}
        </div>

        {challenge.sponsorName && (
          <p className={cn(
            "text-xs mt-2",
            isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/40"
          )}>
            Sponsored by {challenge.sponsorName}
          </p>
        )}
      </GlassPanel>
    </Link>
  );
}

export default function ChallengesPage() {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';
  const [filter, setFilter] = useState<FilterTab>('active');

  const { challenges, isLoading } = useChallenges(filter);

  return (
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
        )}>Challenges</h1>
        <p className={isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"}>
          Compete with the community in weekly challenges
        </p>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex justify-center">
        <div className={cn(
          "inline-flex rounded-full p-1",
          isNeumorphic
            ? "bg-neumorphic-bg shadow-neumorphic-inset"
            : "bg-glass-white backdrop-blur-glass border border-glass-border"
        )}>
          {(['active', 'upcoming', 'completed'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize",
                filter === tab
                  ? isNeumorphic
                    ? "bg-neumorphic-bg shadow-neumorphic-sm text-neumorphic-text"
                    : "bg-vibe-purple text-white"
                  : isNeumorphic
                    ? "text-neumorphic-text-secondary hover:text-neumorphic-text"
                    : "text-white/60 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Challenges List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <GlassPanel key={i} className="animate-pulse">
              <div className="h-6 w-48 bg-white/10 rounded mb-3" />
              <div className="h-4 w-full bg-white/10 rounded mb-2" />
              <div className="h-4 w-32 bg-white/10 rounded" />
            </GlassPanel>
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <GlassPanel className="text-center" padding="lg">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className={cn(
            "text-xl font-semibold mb-2",
            isNeumorphic ? "text-neumorphic-text" : "text-white"
          )}>
            No {filter} challenges
          </h2>
          <p className={isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"}>
            {filter === 'active'
              ? 'Check back soon for new challenges!'
              : filter === 'upcoming'
              ? 'No upcoming challenges scheduled yet.'
              : 'No completed challenges yet.'}
          </p>
        </GlassPanel>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ChallengeCard challenge={challenge} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Back to Feed link */}
      <div className="text-center">
        <Link
          href="/feed"
          className={cn(
            "text-sm hover:underline",
            isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/50"
          )}
        >
          ← Back to Feed
        </Link>
      </div>
    </div>
  );
}
