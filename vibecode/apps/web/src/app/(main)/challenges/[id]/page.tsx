'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useChallenge, useChallengeShots, useChallengeLeaderboard } from '@/hooks/useChallenges';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Avatar } from '@/components/ui/Avatar';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

type ViewTab = 'submissions' | 'leaderboard';

export default function ChallengeDetailPage() {
  const params = useParams();
  const challengeId = params.id as string;
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';
  const [viewTab, setViewTab] = useState<ViewTab>('submissions');

  const { challenge, isLoading: challengeLoading } = useChallenge(challengeId);
  const { shots, isLoading: shotsLoading } = useChallengeShots(challengeId);
  const { leaderboard, isLoading: leaderboardLoading } = useChallengeLeaderboard(challengeId);

  const isLoading = challengeLoading;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = () => {
    if (!challenge) return null;
    switch (challenge.status) {
      case 'active':
        return (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
            Accepting Submissions
          </span>
        );
      case 'voting':
        return (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400">
            Voting Open
          </span>
        );
      case 'upcoming':
        return (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">
            Starting Soon
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400">
            Completed
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <GlassPanel className="animate-pulse">
          <div className="h-8 w-64 bg-white/10 rounded mb-4" />
          <div className="h-4 w-full bg-white/10 rounded mb-2" />
          <div className="h-4 w-48 bg-white/10 rounded" />
        </GlassPanel>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-2xl mx-auto">
        <GlassPanel className="text-center" padding="lg">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className={cn(
            "text-xl font-semibold mb-2",
            isNeumorphic ? "text-neumorphic-text" : "text-white"
          )}>
            Challenge not found
          </h1>
          <Link
            href="/challenges"
            className="text-vibe-purple hover:text-vibe-purple-light transition-colors"
          >
            ← Back to Challenges
          </Link>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Challenge Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassPanel>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              {challenge.isOfficial && (
                <span className="text-2xl" title="Official Challenge">⭐</span>
              )}
              {challenge.isSponsored && (
                <span className="text-2xl" title="Sponsored">💎</span>
              )}
            </div>
            {getStatusBadge()}
          </div>

          <h1 className={cn(
            "text-2xl font-bold mb-3",
            isNeumorphic ? "text-neumorphic-text" : "text-white"
          )}>
            {challenge.title}
          </h1>

          {challenge.description && (
            <p className={cn(
              "mb-4",
              isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/70"
            )}>
              {challenge.description}
            </p>
          )}

          <div className={cn(
            "flex flex-wrap gap-4 text-sm border-t pt-4",
            isNeumorphic ? "border-neumorphic-border text-neumorphic-text-secondary" : "border-white/10 text-white/50"
          )}>
            <div>
              <span className="block text-xs uppercase opacity-60">Starts</span>
              {formatDate(challenge.startsAt)}
            </div>
            <div>
              <span className="block text-xs uppercase opacity-60">Ends</span>
              {formatDate(challenge.endsAt)}
            </div>
            {challenge.votingEndsAt && (
              <div>
                <span className="block text-xs uppercase opacity-60">Voting Ends</span>
                {formatDate(challenge.votingEndsAt)}
              </div>
            )}
          </div>

          {challenge.prizeDescription && (
            <div className={cn(
              "mt-4 p-3 rounded-lg",
              isNeumorphic ? "bg-neumorphic-bg-dark" : "bg-yellow-500/10"
            )}>
              <span className="text-yellow-400">🏆 Prize: {challenge.prizeDescription}</span>
            </div>
          )}

          {challenge.sponsorName && (
            <p className={cn(
              "text-sm mt-3",
              isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/40"
            )}>
              Sponsored by {challenge.sponsorName}
            </p>
          )}
        </GlassPanel>
      </motion.div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className={cn(
          "inline-flex rounded-full p-1",
          isNeumorphic
            ? "bg-neumorphic-bg shadow-neumorphic-inset"
            : "bg-glass-white backdrop-blur-glass border border-glass-border"
        )}>
          <button
            onClick={() => setViewTab('submissions')}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              viewTab === 'submissions'
                ? isNeumorphic
                  ? "bg-neumorphic-bg shadow-neumorphic-sm text-neumorphic-text"
                  : "bg-vibe-purple text-white"
                : isNeumorphic
                  ? "text-neumorphic-text-secondary hover:text-neumorphic-text"
                  : "text-white/60 hover:text-white"
            )}
          >
            Submissions ({shots.length})
          </button>
          <button
            onClick={() => setViewTab('leaderboard')}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              viewTab === 'leaderboard'
                ? isNeumorphic
                  ? "bg-neumorphic-bg shadow-neumorphic-sm text-neumorphic-text"
                  : "bg-vibe-purple text-white"
                : isNeumorphic
                  ? "text-neumorphic-text-secondary hover:text-neumorphic-text"
                  : "text-white/60 hover:text-white"
            )}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* Content based on tab */}
      {viewTab === 'submissions' ? (
        <motion.div
          key="submissions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {shotsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square bg-white/10 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : shots.length === 0 ? (
            <GlassPanel className="text-center" padding="lg">
              <div className="text-4xl mb-4">📸</div>
              <p className={isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"}>
                No submissions yet. Be the first to submit!
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {shots.map((shot, index) => (
                <motion.div
                  key={shot.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                >
                  <Image
                    src={shot.imageUrl}
                    alt={shot.caption || shot.prompt || 'Submission'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 336px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={shot.user.avatarUrl}
                          alt={shot.user.displayName}
                          size="sm"
                        />
                        <span className="text-white text-sm font-medium truncate">
                          {shot.user.displayName}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="leaderboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {leaderboardLoading ? (
            <GlassPanel className="space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white/10 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-white/10 rounded mb-1" />
                    <div className="h-3 w-20 bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </GlassPanel>
          ) : leaderboard.length === 0 ? (
            <GlassPanel className="text-center" padding="lg">
              <div className="text-4xl mb-4">🏅</div>
              <p className={isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"}>
                No rankings yet. Vote on submissions to see the leaderboard!
              </p>
            </GlassPanel>
          ) : (
            <GlassPanel>
              <div className="space-y-4">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.shotId}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg transition-colors",
                      isNeumorphic ? "hover:bg-neumorphic-bg-dark" : "hover:bg-white/5"
                    )}
                  >
                    {/* Rank */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold",
                      index === 0 ? "bg-yellow-500/20 text-yellow-400" :
                      index === 1 ? "bg-gray-300/20 text-gray-300" :
                      index === 2 ? "bg-orange-500/20 text-orange-400" :
                      isNeumorphic ? "bg-neumorphic-bg-dark text-neumorphic-text-secondary" : "bg-white/10 text-white/50"
                    )}>
                      {entry.rank}
                    </div>

                    {/* User info */}
                    <Avatar
                      src={entry.avatarUrl}
                      alt={entry.displayName}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium truncate",
                        isNeumorphic ? "text-neumorphic-text" : "text-white"
                      )}>
                        {entry.displayName}
                      </p>
                      <p className={cn(
                        "text-sm",
                        isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/50"
                      )}>
                        @{entry.username}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        isNeumorphic ? "text-neumorphic-accent" : "text-vibe-purple-light"
                      )}>
                        {entry.averageScore.toFixed(1)}
                      </p>
                      <p className={cn(
                        "text-xs",
                        isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/40"
                      )}>
                        {entry.voteCount} vote{entry.voteCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}
        </motion.div>
      )}

      {/* Back to Challenges link */}
      <div className="text-center">
        <Link
          href="/challenges"
          className={cn(
            "text-sm hover:underline",
            isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/50"
          )}
        >
          ← Back to Challenges
        </Link>
      </div>
    </div>
  );
}
