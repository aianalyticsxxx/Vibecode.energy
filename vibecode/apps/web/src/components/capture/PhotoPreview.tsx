'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';

export interface PhotoPreviewProps {
  imageBlob: Blob;
  onPost: (caption: string) => void;
  onRetake: () => void;
  isPosting?: boolean;
  className?: string;
}

export function PhotoPreview({
  imageBlob,
  onPost,
  onRetake,
  isPosting = false,
  className,
}: PhotoPreviewProps) {
  const [caption, setCaption] = useState('');
  const [imageUrl] = useState(() => URL.createObjectURL(imageBlob));

  const handlePost = () => {
    onPost(caption);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-6', className)}
    >
      {/* Image preview */}
      <div className="relative aspect-square rounded-2xl overflow-hidden shadow-glass-lg">
        <Image
          src={imageUrl}
          alt="Your vibe"
          fill
          className="object-cover"
          unoptimized
        />

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Retake button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onRetake}
          disabled={isPosting}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors disabled:opacity-50"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </motion.button>
      </div>

      {/* Caption input */}
      <GlassPanel padding="none" className="overflow-hidden">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="What's the vibe? (optional)"
          maxLength={280}
          disabled={isPosting}
          className={cn(
            'w-full bg-transparent text-white placeholder-white/40',
            'p-4 resize-none outline-none',
            'min-h-[100px]',
            'disabled:opacity-50'
          )}
        />
        <div className="px-4 pb-3 flex justify-between items-center border-t border-glass-border/50">
          <span className="text-xs text-white/40">{caption.length}/280</span>
          <div className="flex gap-2">
            {['✨', '💜', '🌊', '🔥'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => setCaption((prev) => prev + emoji)}
                disabled={isPosting || caption.length >= 280}
                className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </GlassPanel>

      {/* Post button */}
      <Button
        variant="gradient"
        size="lg"
        onClick={handlePost}
        isLoading={isPosting}
        className="w-full"
      >
        {isPosting ? 'Sharing your vibe...' : 'Share your vibe ✨'}
      </Button>

      {/* Helper text */}
      <p className="text-center text-white/40 text-sm">
        Share your daily vibe with the community
      </p>
    </motion.div>
  );
}
