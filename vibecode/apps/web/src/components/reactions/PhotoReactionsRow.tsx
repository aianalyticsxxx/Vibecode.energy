'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { api, Reaction } from '@/lib/api';
import { ReactionCaptureModal } from './ReactionCaptureModal';

interface PhotoReactionsRowProps {
  vibeId: string;
  className?: string;
}

export function PhotoReactionsRow({ vibeId, className }: PhotoReactionsRowProps) {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';
  const [showCaptureModal, setShowCaptureModal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reactions', vibeId],
    queryFn: async () => {
      const response = await api.getReactions(vibeId);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  });

  const photoReactions = data?.reactions.filter((r) => r.reactionType === 'photo') ?? [];
  const displayReactions = photoReactions.slice(0, 5);
  const remainingCount = photoReactions.length - displayReactions.length;

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-8 h-8 rounded-full animate-pulse',
              isNeumorphic ? 'bg-neumorphic-bg-dark' : 'bg-white/10'
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={cn('flex items-center gap-1', className)}>
        {/* Existing photo reactions */}
        {displayReactions.map((reaction, index) => (
          <motion.div
            key={reaction.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
          >
            <Image
              src={reaction.imageUrl!}
              alt={`Reaction by ${reaction.user.displayName}`}
              width={32}
              height={32}
              className={cn(
                'w-8 h-8 rounded-full object-cover border-2',
                isNeumorphic
                  ? 'border-neumorphic-bg'
                  : 'border-white/20'
              )}
              title={reaction.user.displayName}
            />
          </motion.div>
        ))}

        {/* Remaining count badge */}
        {remainingCount > 0 && (
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
              isNeumorphic
                ? 'bg-neumorphic-bg-dark text-neumorphic-text-secondary'
                : 'bg-white/10 text-white/60'
            )}
          >
            +{remainingCount}
          </div>
        )}

        {/* Add reaction button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCaptureModal(true)}
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
            isNeumorphic
              ? 'bg-neumorphic-bg-dark text-neumorphic-text-secondary hover:text-neumorphic-text border border-neumorphic-shadow-light'
              : 'bg-white/10 text-white/40 hover:text-white hover:bg-white/20 border border-white/10'
          )}
          title="Add your reaction"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
        </motion.button>
      </div>

      {/* Capture modal */}
      <AnimatePresence>
        {showCaptureModal && (
          <ReactionCaptureModal
            vibeId={vibeId}
            onClose={() => setShowCaptureModal(false)}
            onSuccess={() => {
              setShowCaptureModal(false);
              refetch();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
