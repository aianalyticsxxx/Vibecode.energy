'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useChallenges } from '@/hooks/useChallenges';
import type { Challenge } from '@/lib/api';

type FilterTab = 'active' | 'upcoming' | 'completed';

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const getStatusBadge = () => {
    switch (challenge.status) {
      case 'active':
        return (
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-green-500/50 text-green-400 bg-green-500/10">
            ACTIVE
          </span>
        );
      case 'voting':
        return (
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-yellow-500/50 text-yellow-400 bg-yellow-500/10">
            VOTING
          </span>
        );
      case 'upcoming':
        return (
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-blue-500/50 text-blue-400 bg-blue-500/10">
            UPCOMING
          </span>
        );
      case 'completed':
        return (
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-terminal-border text-terminal-text-secondary bg-terminal-bg-elevated">
            COMPLETED
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
      <div className="bg-terminal-bg-elevated border border-terminal-border rounded-lg p-4 hover:border-terminal-border-bright transition-colors cursor-pointer">
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
            <h3 className="font-mono font-semibold text-terminal-text">
              {challenge.title}
            </h3>
          </div>
          {getStatusBadge()}
        </div>

        {challenge.description && (
          <p className="text-sm text-terminal-text-secondary mb-3 line-clamp-2">
            {challenge.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm font-mono text-terminal-text-secondary">
          <span>
            {formatDate(challenge.startsAt)} → {formatDate(challenge.endsAt)}
          </span>
          {challenge.prizeDescription && (
            <span className="text-yellow-400/80">
              🏆 {challenge.prizeDescription}
            </span>
          )}
        </div>

        {challenge.sponsorName && (
          <p className="text-xs font-mono text-terminal-text-secondary mt-2 opacity-60">
            Sponsored by {challenge.sponsorName}
          </p>
        )}
      </div>
    </Link>
  );
}

export function ChallengesFeed() {
  const [filter, setFilter] = useState<FilterTab>('active');
  const { challenges, isLoading } = useChallenges(filter);

  return (
    <div className="space-y-4">
      {/* Sub-filter tabs */}
      <div className="flex items-center gap-2">
        {(['active', 'upcoming', 'completed'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`
              font-mono text-xs py-1.5 px-3 rounded border transition-all uppercase
              ${filter === tab
                ? 'bg-terminal-accent/10 border-terminal-accent text-terminal-accent'
                : 'bg-terminal-bg border-terminal-border text-terminal-text-secondary hover:text-terminal-text hover:border-terminal-border-bright'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Challenges List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-terminal-bg-elevated border border-terminal-border rounded-lg p-4 animate-pulse">
              <div className="h-5 w-48 bg-terminal-border rounded mb-3" />
              <div className="h-4 w-full bg-terminal-border rounded mb-2" />
              <div className="h-4 w-32 bg-terminal-border rounded" />
            </div>
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <div className="bg-terminal-bg-elevated border border-terminal-border rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h2 className="font-mono text-lg text-terminal-text mb-2">
            No {filter} challenges
          </h2>
          <p className="text-terminal-text-secondary text-sm">
            {filter === 'active'
              ? 'Check back soon for new challenges!'
              : filter === 'upcoming'
              ? 'No upcoming challenges scheduled yet.'
              : 'No completed challenges yet.'}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={filter}
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
        </AnimatePresence>
      )}
    </div>
  );
}
