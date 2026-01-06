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
      {/* Dual photo display - Prompt → Result style */}
      <div className="relative">
        {/* Main image: Result (full width) - the output */}
        <div
          className="relative aspect-video rounded-2xl overflow-hidden bg-black cursor-pointer group"
          onClick={() => setExpandedImage('result')}
        >
          <img
            src={resultUrl}
            alt="Result"
            className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
          />
          {/* Hover hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              Tap to expand
            </span>
          </div>
        </div>

        {/* Prompt overlay (bigger, in corner) - the input */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute top-3 left-3 w-28 h-28 md:w-36 md:h-36 rounded-xl overflow-hidden border-3 border-vibe-purple shadow-lg cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedImage('prompt');
          }}
        >
          <img
            src={promptUrl}
            alt="Prompt"
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
          />
          {/* Prompt indicator */}
          <div className="absolute bottom-0 left-0 right-0 bg-vibe-purple/90 py-0.5 text-center">
            <span className="text-[10px] text-white font-medium">💬 PROMPT</span>
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
        </motion.div>

        {/* Labels */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <span className="bg-green-500/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium">
            ✨ RESULT
          </span>
        </div>
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
              <div className={`rounded-2xl overflow-hidden border-4 ${expandedImage === 'prompt' ? 'border-vibe-purple' : 'border-green-500'}`}>
                <img
                  src={expandedImage === 'prompt' ? promptUrl : resultUrl}
                  alt={expandedImage === 'prompt' ? 'Prompt' : 'Result'}
                  className="w-full h-auto max-h-[80vh] object-contain bg-black"
                />
              </div>

              {/* Label */}
              <div className="absolute bottom-4 left-4">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  expandedImage === 'prompt'
                    ? 'bg-vibe-purple text-white'
                    : 'bg-green-500 text-white'
                }`}>
                  {expandedImage === 'prompt' ? '💬 PROMPT' : '✨ RESULT'}
                </span>
              </div>

              {/* Navigation dots */}
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setExpandedImage('prompt')}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    expandedImage === 'prompt' ? 'bg-vibe-purple' : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
                <button
                  onClick={() => setExpandedImage('result')}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    expandedImage === 'result' ? 'bg-green-500' : 'bg-white/30 hover:bg-white/50'
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
