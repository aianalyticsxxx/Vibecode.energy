'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { VibeButton } from './VibeButton';
import { FollowButton } from './FollowButton';
import { PhotoReactionsRow } from '@/components/reactions/PhotoReactionsRow';
import type { Shot } from '@/lib/api';

// Keep Vibe as an alias for backwards compatibility
type Vibe = Shot;

export interface VibeCardProps {
  vibe: Vibe;
  className?: string;
}

// Format timestamp for terminal header
function formatTerminalTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' UTC';
}

export function VibeCard({ vibe, className }: VibeCardProps) {
  const router = useRouter();
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

  // Generate a short ID for the terminal path
  const shortId = vibe.id.substring(0, 7);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden shadow-terminal',
        className
      )}
    >
      {/* Terminal Header */}
      <div className="bg-terminal-bg-elevated px-4 py-2.5 border-b border-terminal-border flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-3 h-3 rounded-full bg-terminal-error/60" />
            <span className="w-3 h-3 rounded-full bg-terminal-warning/60" />
            <span className="w-3 h-3 rounded-full bg-terminal-success/60" />
          </div>

          {/* Terminal path */}
          <div className="flex items-center gap-2 font-mono text-sm min-w-0">
            <Link
              href={`/profile/${vibe.user.username}`}
              className="text-terminal-text-secondary hover:text-terminal-accent transition-colors truncate"
            >
              @{vibe.user.username}
            </Link>
            <span className="text-terminal-text-dim">~</span>
            <span className="text-terminal-accent truncate">shot/{shortId}</span>
          </div>
        </div>

        {/* Timestamp */}
        <span className="font-mono text-xs text-terminal-text-dim flex-shrink-0 ml-2">
          {formatTerminalTime(vibe.createdAt)}
        </span>
      </div>

      {/* Caption as command */}
      {vibe.caption && (
        <div className="px-4 py-3 border-b border-terminal-border">
          <div className="flex items-start gap-2 font-mono text-sm">
            <span className="text-terminal-accent flex-shrink-0">$</span>
            <p className="text-terminal-text">{vibe.caption}</p>
          </div>
        </div>
      )}

      {/* Image with separate clickable regions for prompt and result */}
      <div className="relative aspect-video bg-terminal-bg">
        {/* Main image - clicking expands as "result" view */}
        <motion.div
          className="absolute inset-0 cursor-pointer group"
          whileHover={{ scale: 1.003 }}
          transition={{ duration: 0.2 }}
          onClick={() => setExpandedView('result')}
        >
          <Image
            src={vibe.imageUrl}
            alt={vibe.caption || `Shot by ${vibe.user.displayName}`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 672px"
          />
          {/* Result label */}
          <div className="absolute bottom-2 right-2">
            <span className="bg-terminal-success/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-mono opacity-60 group-hover:opacity-100 transition-opacity">
              output
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
          <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover/prompt:border-terminal-accent group-hover/prompt:bg-terminal-accent/10 transition-all" />
          {/* Prompt label that appears on hover */}
          <div className="absolute -bottom-1 left-0 opacity-0 group-hover/prompt:opacity-100 transition-opacity">
            <span className="bg-terminal-accent/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white font-mono">
              prompt
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
            className="fixed inset-0 z-50 bg-terminal-bg/98 flex items-center justify-center p-4"
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
                className="absolute -top-12 right-0 text-terminal-text-secondary hover:text-terminal-text transition-colors flex items-center gap-2 font-mono text-sm"
              >
                <span>esc to close</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Image display based on view */}
              <div className={cn(
                "rounded-lg overflow-hidden border-2 bg-terminal-bg",
                expandedView === 'prompt' ? "border-terminal-accent" : "border-terminal-success"
              )}>
                {expandedView === 'prompt' ? (
                  // Prompt view: zoom into top-left corner where the prompt overlay lives
                  <div
                    className="relative overflow-hidden bg-terminal-bg"
                    style={{ width: 'min(80vw, 80vh)', height: 'min(80vw, 80vh)' }}
                  >
                    <img
                      src={vibe.imageUrl}
                      alt={`Prompt for ${vibe.caption || `Shot by ${vibe.user.displayName}`}`}
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
                    alt={vibe.caption || `Shot by ${vibe.user.displayName}`}
                    style={{
                      maxWidth: '90vw',
                      maxHeight: '80vh',
                      objectFit: 'contain',
                    }}
                  />
                )}
              </div>

              {/* Toggle between views - terminal button style */}
              <div className="flex justify-center items-center gap-3 mt-4">
                <button
                  onClick={() => setExpandedView('prompt')}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-mono transition-all border",
                    expandedView === 'prompt'
                      ? "bg-terminal-accent/20 border-terminal-accent text-terminal-accent"
                      : "bg-terminal-bg-elevated border-terminal-border text-terminal-text-secondary hover:text-terminal-text"
                  )}
                >
                  ./prompt
                </button>
                <button
                  onClick={() => setExpandedView('result')}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-mono transition-all border",
                    expandedView === 'result'
                      ? "bg-terminal-success/20 border-terminal-success text-terminal-success"
                      : "bg-terminal-bg-elevated border-terminal-border text-terminal-text-secondary hover:text-terminal-text"
                  )}
                >
                  ./output
                </button>
              </div>

              {/* User info in modal */}
              <div className="flex items-center gap-2 mt-4 bg-terminal-bg-elevated border border-terminal-border px-3 py-2 rounded-md">
                <Avatar
                  src={vibe.user.avatarUrl}
                  alt={vibe.user.displayName}
                  size="sm"
                />
                <span className="text-terminal-text text-sm font-mono">@{vibe.user.username}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer - Terminal style status and actions */}
      <div className="p-4 border-t border-terminal-border">
        {/* Status line */}
        <div className="flex items-center gap-4 mb-3 font-mono text-sm">
          <div className="flex items-center gap-2">
            <span className="text-terminal-success">✓</span>
            <span className="text-terminal-text-secondary">shipped</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-terminal-text-dim">&gt;</span>
            <span className="text-terminal-text-secondary">
              {formatRelativeTime(vibe.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VibeButton
              vibeId={vibe.id}
              sparkleCount={vibe.sparkleCount}
              hasSparkled={vibe.hasSparkled}
            />

            {/* Comment button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push(`/shot/${vibe.id}/comments`)}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-md
                         bg-terminal-bg-elevated border border-terminal-border
                         text-terminal-text-secondary hover:text-terminal-text
                         hover:border-terminal-border-bright transition-all font-mono text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {(vibe.commentCount ?? 0) > 0 && (
                <span>{vibe.commentCount}</span>
              )}
            </motion.button>

            {/* Follow button */}
            <FollowButton userId={vibe.user.id} size="sm" />
          </div>

          {/* Share button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="py-1.5 px-3 rounded-md
                       bg-terminal-bg-elevated border border-terminal-border
                       text-terminal-text-secondary hover:text-terminal-text
                       hover:border-terminal-border-bright transition-all"
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
              className="w-4 h-4"
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
        <div className="mt-3 pt-3 border-t border-terminal-border">
          <PhotoReactionsRow vibeId={vibe.id} />
        </div>
      </div>
    </motion.div>
  );
}
