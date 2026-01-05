'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn, formatRelativeTime } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Avatar } from '@/components/ui/Avatar';
import { VibeButton } from './VibeButton';
import { LateBadge } from './LateBadge';
import { PhotoReactionsRow } from '@/components/reactions/PhotoReactionsRow';
import { useTheme } from '@/hooks/useTheme';
import type { Vibe } from '@/lib/api';

export interface VibeCardProps {
  vibe: Vibe;
  className?: string;
}

export function VibeCard({ vibe, className }: VibeCardProps) {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  return (
    <GlassPanel className={cn('overflow-hidden', className)} padding="none">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <Link href={`/profile/${vibe.user.username}`}>
          <Avatar
            src={vibe.user.avatarUrl}
            alt={vibe.user.displayName}
            size="md"
            glow={!isNeumorphic}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${vibe.user.username}`}
            className={cn(
              "font-semibold hover:text-vibe-purple-light transition-colors block truncate",
              isNeumorphic ? "text-neumorphic-text" : "text-white"
            )}
          >
            {vibe.user.displayName}
          </Link>
          <div className={cn("text-sm flex items-center gap-2 flex-wrap", isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/50")}>
            <span>@{vibe.user.username} · {formatRelativeTime(vibe.createdAt)}</span>
            {vibe.isLate && vibe.lateByMinutes > 0 && (
              <LateBadge lateByMinutes={vibe.lateByMinutes} />
            )}
          </div>
        </div>
      </div>

      {/* Image */}
      <motion.div
        className="relative aspect-square"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        <Image
          src={vibe.imageUrl}
          alt={vibe.caption || `Vibe by ${vibe.user.displayName}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 512px"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity" />
      </motion.div>

      {/* Footer */}
      <div className="p-4">
        {/* Caption */}
        {vibe.caption && (
          <p className={cn("mb-3", isNeumorphic ? "text-neumorphic-text" : "text-white/90")}>
            <Link
              href={`/profile/${vibe.user.username}`}
              className="font-semibold hover:text-vibe-purple-light transition-colors mr-2"
            >
              {vibe.user.username}
            </Link>
            {vibe.caption}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <VibeButton
            vibeId={vibe.id}
            sparkleCount={vibe.sparkleCount}
            hasSparkled={vibe.hasSparkled}
          />

          {/* Share button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className={cn(
              "p-2 transition-colors",
              isNeumorphic
                ? "text-neumorphic-text-secondary hover:text-neumorphic-text"
                : "text-white/50 hover:text-white"
            )}
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Check out this vibe!',
                  url: `${window.location.origin}/vibe/${vibe.id}`,
                });
              }
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </motion.button>
        </div>

        {/* Photo Reactions */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <PhotoReactionsRow vibeId={vibe.id} />
        </div>
      </div>
    </GlassPanel>
  );
}
