'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatRelativeTime } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Avatar } from '@/components/ui/Avatar';
import { VibeButton } from './VibeButton';
import { FollowButton } from './FollowButton';
import { PhotoReactionsRow } from '@/components/reactions/PhotoReactionsRow';
import { useTheme } from '@/hooks/useTheme';
import type { Shot } from '@/lib/api';

// Keep Vibe as an alias for backwards compatibility
type Vibe = Shot;

export interface VibeCardProps {
  vibe: Vibe;
  className?: string;
}

export function VibeCard({ vibe, className }: VibeCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const isNeumorphic = theme === 'neumorphic';
  // null = closed, 'prompt' = zoomed to prompt overlay, 'result' = full image view
  const [expandedView, setExpandedView] = useState<'prompt' | 'result' | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    if (!expandedView) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedView(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [expandedView]);

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
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${vibe.user.username}`}
              className={cn(
                "font-semibold hover:text-vibe-purple-light transition-colors truncate",
                isNeumorphic ? "text-neumorphic-text" : "text-white"
              )}
            >
              {vibe.user.displayName}
            </Link>
            <FollowButton userId={vibe.user.id} size="sm" />
          </div>
          <div className={cn("text-sm flex items-center gap-2 flex-wrap", isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/50")}>
            <span>@{vibe.user.username} · {formatRelativeTime(vibe.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Image with separate clickable regions for prompt and result */}
      <div className="relative aspect-video bg-black">
        {/* Main image - clicking expands as "result" view */}
        <motion.div
          className="absolute inset-0 cursor-pointer group"
          whileHover={{ scale: 1.005 }}
          transition={{ duration: 0.2 }}
          onClick={() => setExpandedView('result')}
        >
          <Image
            src={vibe.imageUrl}
            alt={vibe.caption || `Vibe by ${vibe.user.displayName}`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 672px"
          />
          {/* Result label */}
          <div className="absolute bottom-2 right-2">
            <span className="bg-green-500/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium opacity-60 group-hover:opacity-100 transition-opacity">
              ✨ RESULT
            </span>
          </div>
        </motion.div>

        {/* Clickable prompt overlay zone (top-left corner) */}
        <motion.div
          className="absolute top-2 left-2 w-[30%] aspect-square cursor-pointer z-10 group/prompt"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            setExpandedView('prompt');
          }}
        >
          {/* Invisible hit area with visible hover effect */}
          <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover/prompt:border-vibe-purple group-hover/prompt:bg-vibe-purple/10 transition-all" />
          {/* Prompt label that appears on hover */}
          <div className="absolute -bottom-1 left-0 opacity-0 group-hover/prompt:opacity-100 transition-opacity">
            <span className="bg-vibe-purple/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white font-medium">
              💬 PROMPT - tap to expand
            </span>
          </div>
        </motion.div>
      </div>

      {/* Expanded image modal */}
      <AnimatePresence>
        {expandedView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setExpandedView(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setExpandedView(null)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-2"
              >
                <span className="text-sm">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Image display based on view */}
              <div className={cn(
                "rounded-2xl overflow-hidden border-4 bg-black",
                expandedView === 'prompt' ? "border-vibe-purple" : "border-green-500"
              )}>
                {expandedView === 'prompt' ? (
                  // Prompt view: zoom into top-left corner where the prompt overlay lives
                  // The prompt is 35% of the image height, positioned at ~1.25% margin
                  // To fill the container, we scale by ~2.85x (100/35)
                  <div
                    className="relative overflow-hidden bg-black"
                    style={{ width: 'min(80vw, 80vh)', height: 'min(80vw, 80vh)' }}
                  >
                    <img
                      src={vibe.imageUrl}
                      alt={`Prompt for ${vibe.caption || `Vibe by ${vibe.user.displayName}`}`}
                      style={{
                        position: 'absolute',
                        top: '-1%',
                        left: '-1%',
                        width: '285%',
                        height: 'auto',
                        transformOrigin: 'top left',
                      }}
                    />
                  </div>
                ) : (
                  // Result view: show the full image at full resolution
                  <img
                    src={vibe.imageUrl}
                    alt={vibe.caption || `Vibe by ${vibe.user.displayName}`}
                    style={{
                      maxWidth: '90vw',
                      maxHeight: '80vh',
                      objectFit: 'contain',
                    }}
                  />
                )}
              </div>

              {/* Toggle between views */}
              <div className="flex justify-center items-center gap-3 mt-4">
                <button
                  onClick={() => setExpandedView('prompt')}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    expandedView === 'prompt'
                      ? "bg-vibe-purple text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  )}
                >
                  💬 Prompt
                </button>
                <button
                  onClick={() => setExpandedView('result')}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    expandedView === 'result'
                      ? "bg-green-500 text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  )}
                >
                  ✨ Result
                </button>
              </div>

              {/* User info in modal */}
              <div className="flex items-center gap-2 mt-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full">
                <Avatar
                  src={vibe.user.avatarUrl}
                  alt={vibe.user.displayName}
                  size="sm"
                />
                <span className="text-white text-sm font-medium">{vibe.user.displayName}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="flex items-center gap-4">
            <VibeButton
              vibeId={vibe.id}
              sparkleCount={vibe.sparkleCount}
              hasSparkled={vibe.hasSparkled}
            />

            {/* Comment button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push(`/shot/${vibe.id}/comments`)}
              className={cn(
                "flex items-center gap-1.5 p-2 transition-colors",
                isNeumorphic
                  ? "text-neumorphic-text-secondary hover:text-neumorphic-text"
                  : "text-white/50 hover:text-white"
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {(vibe.commentCount ?? 0) > 0 && (
                <span className="text-sm font-medium">{vibe.commentCount}</span>
              )}
            </motion.button>
          </div>

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
                  title: 'Check out this shot!',
                  url: `${window.location.origin}/shot/${vibe.id}`,
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
