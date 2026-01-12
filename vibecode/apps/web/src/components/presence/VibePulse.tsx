'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { useOnlineFriends } from '@/hooks/useOnlineFriends';
import { useAuth } from '@/hooks/useAuth';

export function VibePulse() {
  const { user } = useAuth();
  const { onlineFriends, isLoading } = useOnlineFriends();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if not logged in or no friends online
  if (!user || isLoading || onlineFriends.length === 0) {
    return null;
  }

  const displayedAvatars = onlineFriends.slice(0, 3);
  const remainingCount = onlineFriends.length - 3;

  return (
    <>
      {/* Collapsed floating bubble */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsExpanded(true)}
            className="fixed bottom-20 right-4 z-40"
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(139, 92, 246, 0.4)',
                  '0 0 0 12px rgba(139, 92, 246, 0)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative w-12 h-12 rounded-full bg-glass-dark backdrop-blur-glass border border-vibe-purple/50 flex items-center justify-center"
            >
              {/* Stacked avatars */}
              <div className="flex -space-x-2">
                {displayedAvatars.map((friend, i) => (
                  <div
                    key={friend.id}
                    className="relative"
                    style={{ zIndex: 3 - i }}
                  >
                    <Avatar
                      src={friend.avatarUrl}
                      alt={friend.displayName}
                      size="xs"
                      className="ring-2 ring-black"
                    />
                  </div>
                ))}
              </div>

              {/* Count badge */}
              {remainingCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-vibe-purple text-white text-[10px] font-bold flex items-center justify-center">
                  +{remainingCount}
                </div>
              )}

              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-black" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded radial view */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative w-64 h-64"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Center pulsing orb */}
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-vibe-purple to-vibe-pink flex items-center justify-center"
              >
                <span className="text-2xl">✨</span>
              </motion.div>

              {/* Radial avatars */}
              {onlineFriends.slice(0, 8).map((friend, i) => {
                const angle = (i * 360) / Math.min(onlineFriends.length, 8);
                const radius = 100; // pixels from center
                const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius;
                const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius;

                return (
                  <motion.div
                    key={friend.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    }}
                  >
                    <Link
                      href={`/profile/${friend.username}`}
                      onClick={() => setIsExpanded(false)}
                      className="block group"
                    >
                      <div className="relative">
                        <Avatar
                          src={friend.avatarUrl}
                          alt={friend.displayName}
                          size="md"
                          className="ring-2 ring-green-500 group-hover:ring-vibe-purple transition-all"
                          glow
                        />
                        {/* Username tooltip on hover */}
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          <span className="text-xs text-white/80 bg-black/60 px-2 py-0.5 rounded">
                            @{friend.username}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}

              {/* More indicator */}
              {onlineFriends.length > 8 && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-white/60 text-sm">
                  +{onlineFriends.length - 8} more
                </div>
              )}
            </motion.div>

            {/* Title */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
              <h3 className="text-lg font-semibold text-white">Vibing Now</h3>
              <p className="text-sm text-white/60">{onlineFriends.length} friends online</p>
            </div>

            {/* Close hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-sm">
              Tap anywhere to close
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
