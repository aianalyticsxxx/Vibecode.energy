'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api';
import { VibeCard } from '@/components/feed/VibeCard';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export default function ShotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shotId = params.id as string;
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  const { data: shot, isLoading, error } = useQuery({
    queryKey: ['shot', shotId],
    queryFn: async () => {
      const { data, error } = await api.getShot(shotId);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!shotId,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <GlassPanel className="animate-pulse">
          <div className="h-8 w-32 bg-white/10 rounded mb-4" />
          <div className="aspect-video bg-white/10 rounded mb-4" />
          <div className="h-4 w-full bg-white/10 rounded mb-2" />
          <div className="h-4 w-48 bg-white/10 rounded" />
        </GlassPanel>
      </div>
    );
  }

  if (error || !shot) {
    return (
      <div className="max-w-2xl mx-auto">
        <GlassPanel className="text-center" padding="lg">
          <div className="text-5xl mb-4">404</div>
          <h1 className={cn(
            "text-xl font-semibold mb-2",
            isNeumorphic ? "text-neumorphic-text" : "text-white"
          )}>
            Shot not found
          </h1>
          <p className={cn(
            "mb-4",
            isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"
          )}>
            This shot may have been deleted or doesn&apos;t exist.
          </p>
          <Link
            href="/feed"
            className="text-vibe-purple hover:text-vibe-purple-light transition-colors"
          >
            Back to Feed
          </Link>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <button
          onClick={() => router.back()}
          className={cn(
            "flex items-center gap-2 p-2 rounded-full transition-colors",
            isNeumorphic
              ? "text-neumorphic-text-secondary hover:text-neumorphic-text"
              : "text-white/60 hover:text-white"
          )}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      </motion.div>

      {/* Shot card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <VibeCard vibe={shot} />
      </motion.div>

      {/* Prompt text display */}
      {shot.prompt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassPanel>
            <h3 className={cn(
              "text-sm font-medium mb-2",
              isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"
            )}>
              The Prompt
            </h3>
            <p className={cn(
              "text-lg",
              isNeumorphic ? "text-neumorphic-text" : "text-white"
            )}>
              {shot.prompt}
            </p>
          </GlassPanel>
        </motion.div>
      )}

      {/* Challenge info if part of one */}
      {shot.challengeId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link href={`/challenges/${shot.challengeId}`}>
            <GlassPanel className="hover:border-vibe-purple transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <span className={isNeumorphic ? "text-neumorphic-text" : "text-white"}>
                  Part of a challenge - View challenge
                </span>
                <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </GlassPanel>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
