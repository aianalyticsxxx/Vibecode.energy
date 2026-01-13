'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { cn, formatRelativeTime } from '@/lib/utils';
import { api } from '@/lib/api';
import { useComments } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Avatar } from '@/components/ui/Avatar';

export default function CommentsPage() {
  const params = useParams();
  const router = useRouter();
  const shotId = params.id as string;
  const { user } = useAuth();
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  const [newComment, setNewComment] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch the shot for header preview
  const { data: shot, isLoading: shotLoading } = useQuery({
    queryKey: ['shot', shotId],
    queryFn: async () => {
      const { data, error } = await api.getShot(shotId);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!shotId,
  });

  const {
    comments,
    total,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    addComment,
    isAddingComment,
    deleteComment,
  } = useComments(shotId);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom when new comments are added
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isAddingComment) return;

    try {
      await addComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await deleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      {/* Header with vibe preview */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className={cn(
              "p-2 rounded-full transition-colors",
              isNeumorphic
                ? "bg-neumorphic-bg shadow-neumorphic-sm text-neumorphic-text"
                : "bg-glass-white hover:bg-white/20 text-white"
            )}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={cn(
            "text-xl font-bold",
            isNeumorphic ? "text-neumorphic-text" : "text-white"
          )}>
            Comments {total > 0 && `(${total})`}
          </h1>
        </div>

        {/* Shot preview */}
        {shotLoading ? (
          <GlassPanel className="animate-pulse mb-4">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg bg-white/10" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                <div className="h-3 w-32 bg-white/10 rounded" />
              </div>
            </div>
          </GlassPanel>
        ) : shot && (
          <GlassPanel className="mb-4">
            <div className="flex gap-3">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={shot.imageUrl}
                  alt="Shot preview"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${shot.user.username}`}
                  className={cn(
                    "font-semibold hover:text-vibe-purple-light transition-colors",
                    isNeumorphic ? "text-neumorphic-text" : "text-white"
                  )}
                >
                  {shot.user.displayName}
                </Link>
                {shot.prompt && (
                  <p className={cn(
                    "text-sm truncate",
                    isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"
                  )}>
                    {shot.prompt}
                  </p>
                )}
              </div>
            </div>
          </GlassPanel>
        )}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {/* Load more at top */}
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className={cn(
                "text-sm transition-colors",
                isNeumorphic
                  ? "text-neumorphic-text-secondary hover:text-neumorphic-text"
                  : "text-white/60 hover:text-white"
              )}
            >
              {isLoadingMore ? 'Loading...' : 'Load earlier comments'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <GlassPanel className="text-center py-8">
            <div className="text-3xl mb-2">💬</div>
            <p className={isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"}>
              No comments yet. Be the first!
            </p>
          </GlassPanel>
        ) : (
          <AnimatePresence mode="popLayout">
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <GlassPanel className="relative group">
                  <div className="flex gap-3">
                    <Link href={`/profile/${comment.user.username}`}>
                      <Avatar
                        src={comment.user.avatarUrl}
                        alt={comment.user.displayName}
                        size="sm"
                        glow={!isNeumorphic}
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/profile/${comment.user.username}`}
                          className={cn(
                            "font-semibold text-sm hover:text-vibe-purple-light transition-colors",
                            isNeumorphic ? "text-neumorphic-text" : "text-white"
                          )}
                        >
                          {comment.user.displayName}
                        </Link>
                        <span className={cn(
                          "text-xs",
                          isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/40"
                        )}>
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm mt-0.5 break-words",
                        isNeumorphic ? "text-neumorphic-text" : "text-white/90"
                      )}>
                        {comment.content}
                      </p>
                    </div>

                    {/* Delete button - only for own comments */}
                    {user?.id === comment.user.id && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className={cn(
                          "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded",
                          isNeumorphic
                            ? "text-neumorphic-text-secondary hover:text-red-400"
                            : "text-white/40 hover:text-red-400"
                        )}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </GlassPanel>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Fixed input bar at bottom */}
      {user ? (
        <div className="flex-shrink-0 pt-4 border-t border-white/10">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Avatar
              src={user.avatarUrl}
              alt={user.displayName || user.username}
              size="sm"
              glow={!isNeumorphic}
            />
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={1000}
                placeholder="Add a comment..."
                className={cn(
                  "w-full px-4 py-2 pr-16 rounded-full text-sm transition-all",
                  isNeumorphic
                    ? "bg-neumorphic-bg shadow-neumorphic-inset text-neumorphic-text placeholder-neumorphic-text-secondary focus:shadow-neumorphic-sm"
                    : "bg-glass-white border border-glass-border text-white placeholder-white/40 focus:border-vibe-purple"
                )}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isAddingComment}
                className={cn(
                  "absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-sm font-medium transition-all",
                  newComment.trim() && !isAddingComment
                    ? "bg-vibe-purple text-white hover:bg-vibe-purple-light"
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                )}
              >
                {isAddingComment ? '...' : 'Post'}
              </button>
            </div>
          </form>
          <div className={cn(
            "text-xs text-right mt-1",
            isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/40"
          )}>
            {newComment.length}/1000
          </div>
        </div>
      ) : (
        <GlassPanel className="flex-shrink-0 text-center py-4">
          <p className={isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60"}>
            <Link href="/login" className="text-vibe-purple hover:text-vibe-purple-light">
              Sign in
            </Link>{' '}
            to leave a comment
          </p>
        </GlassPanel>
      )}
    </div>
  );
}
