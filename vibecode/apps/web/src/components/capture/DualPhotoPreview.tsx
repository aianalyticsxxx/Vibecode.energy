'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import type { DualCaptureResult } from './DualCapture';

export interface DualPhotoPreviewProps {
  photos: DualCaptureResult;
  onPost: (caption: string) => void;
  onRetake: () => void;
  isPosting: boolean;
}

export function DualPhotoPreview({
  photos,
  onPost,
  onRetake,
  isPosting,
}: DualPhotoPreviewProps) {
  const [caption, setCaption] = useState('');
  const [expandedImage, setExpandedImage] = useState<'prompt' | 'result' | null>(null);

  const promptUrl = useMemo(() => URL.createObjectURL(photos.prompt), [photos.prompt]);
  const resultUrl = useMemo(() => URL.createObjectURL(photos.result), [photos.result]);

  const handlePost = () => {
    onPost(caption);
  };

  return (
    <div className="space-y-4">
      {/* Vertical photo display - Prompt above Result */}
      <div className="space-y-2">
        {/* Prompt section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-lg overflow-hidden bg-terminal-bg border border-terminal-border cursor-pointer group"
          onClick={() => setExpandedImage('prompt')}
        >
          <img
            src={promptUrl}
            alt="Prompt"
            className="w-full object-contain transition-transform group-hover:scale-[1.01]"
          />
          {/* Label overlay */}
          <div className="absolute bottom-3 left-3">
            <span className="bg-terminal-accent/90 backdrop-blur-sm px-3 py-1.5 rounded text-xs text-white font-mono">
              $ prompt
            </span>
          </div>
          {/* Hover hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm bg-black/50 px-3 py-1 rounded-full font-mono">
              tap to expand
            </span>
          </div>
        </motion.div>

        {/* Separator */}
        <div className="h-px bg-terminal-border" />

        {/* Result section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative rounded-lg overflow-hidden bg-terminal-bg border border-terminal-border cursor-pointer group"
          onClick={() => setExpandedImage('result')}
        >
          <img
            src={resultUrl}
            alt="Result"
            className="w-full object-contain transition-transform group-hover:scale-[1.01]"
          />
          {/* Label overlay */}
          <div className="absolute top-3 left-3">
            <span className="bg-terminal-success/90 backdrop-blur-sm px-3 py-1.5 rounded text-xs text-white font-mono">
              &gt; output
            </span>
          </div>
          {/* Hover hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm bg-black/50 px-3 py-1 rounded-full font-mono">
              tap to expand
            </span>
          </div>
        </motion.div>
      </div>

      {/* Expanded image modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-2"
              >
                <span className="text-sm">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Image */}
              <div className={`rounded-lg overflow-hidden border-2 ${expandedImage === 'prompt' ? 'border-terminal-accent' : 'border-terminal-success'}`}>
                <img
                  src={expandedImage === 'prompt' ? promptUrl : resultUrl}
                  alt={expandedImage === 'prompt' ? 'Prompt' : 'Result'}
                  className="w-full h-auto max-h-[80vh] object-contain bg-terminal-bg"
                />
              </div>

              {/* Label */}
              <div className="absolute bottom-4 left-4">
                <span className={`px-3 py-1.5 rounded text-sm font-mono ${
                  expandedImage === 'prompt'
                    ? 'bg-terminal-accent text-white'
                    : 'bg-terminal-success text-white'
                }`}>
                  {expandedImage === 'prompt' ? '$ prompt' : '> output'}
                </span>
              </div>

              {/* Navigation dots */}
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setExpandedImage('prompt')}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    expandedImage === 'prompt' ? 'bg-terminal-accent' : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
                <button
                  onClick={() => setExpandedImage('result')}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    expandedImage === 'result' ? 'bg-terminal-success' : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caption input */}
      <GlassPanel padding="none">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="What did you create?"
          maxLength={280}
          rows={3}
          className="w-full bg-transparent border-none resize-none p-4 text-white placeholder-white/40 focus:outline-none focus:ring-0"
        />
        <div className="px-4 pb-3 flex justify-between items-center border-t border-glass-border pt-2">
          <span className="text-white/40 text-sm">{caption.length}/280</span>
          <div className="flex gap-2">
            {/* Emoji suggestions */}
            <button
              onClick={() => setCaption(caption + ' 💬')}
              className="text-lg hover:scale-110 transition-transform"
            >
              💬
            </button>
            <button
              onClick={() => setCaption(caption + ' ✨')}
              className="text-lg hover:scale-110 transition-transform"
            >
              ✨
            </button>
            <button
              onClick={() => setCaption(caption + ' 🔥')}
              className="text-lg hover:scale-110 transition-transform"
            >
              🔥
            </button>
            <button
              onClick={() => setCaption(caption + ' 🚀')}
              className="text-lg hover:scale-110 transition-transform"
            >
              🚀
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="glass"
          onClick={onRetake}
          disabled={isPosting}
          className="flex-1"
        >
          Retake
        </Button>
        <Button
          variant="gradient"
          onClick={handlePost}
          disabled={isPosting}
          className="flex-1"
        >
          {isPosting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Posting...
            </span>
          ) : (
            'Share Result ✨'
          )}
        </Button>
      </div>
    </div>
  );
}
