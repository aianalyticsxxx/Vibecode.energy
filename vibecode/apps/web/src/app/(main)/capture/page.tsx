'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraCapture } from '@/components/capture/CameraCapture';
import { PhotoPreview } from '@/components/capture/PhotoPreview';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useDailyVibe } from '@/hooks/useDailyVibe';
import { useVibes } from '@/hooks/useVibes';
import { api } from '@/lib/api';

export default function CapturePage() {
  const router = useRouter();
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hasPostedToday, todaysVibe, markAsPosted } = useDailyVibe();
  const { addVibe } = useVibes();

  const handleCapture = useCallback((imageBlob: Blob) => {
    setCapturedImage(imageBlob);
    setError(null);
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setError(null);
  }, []);

  const handlePost = useCallback(
    async (caption: string) => {
      if (!capturedImage) return;

      setIsPosting(true);
      setError(null);

      try {
        const file = new File([capturedImage], 'vibe.jpg', {
          type: 'image/jpeg',
        });

        const { data, error: apiError } = await api.createVibe(file, caption);

        if (apiError) {
          setError(apiError.message);
          return;
        }

        if (data) {
          // Optimistically update state
          markAsPosted(data);
          addVibe(data);

          // Redirect to feed
          router.push('/feed');
        }
      } catch (err) {
        console.error('Failed to post vibe:', err);
        setError('Failed to share your vibe. Please try again.');
      } finally {
        setIsPosting(false);
      }
    },
    [capturedImage, markAsPosted, addVibe, router]
  );

  // If user has already posted today, show their vibe
  if (hasPostedToday && todaysVibe) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassPanel className="text-center" padding="lg">
            <div className="text-5xl mb-4">✨</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Vibe shared!
            </h1>
            <p className="text-white/60 mb-6">
              You&apos;ve already shared your vibe today. Come back tomorrow!
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/feed')}
              className="text-vibe-purple hover:text-vibe-purple-light transition-colors font-medium"
            >
              View your feed
            </motion.button>
          </GlassPanel>
        </motion.div>

        {/* Show today's vibe preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-white/50 text-sm text-center mb-3">
            Today&apos;s vibe
          </p>
          <GlassPanel padding="none" className="overflow-hidden">
            <div className="aspect-square relative">
              <img
                src={todaysVibe.imageUrl}
                alt="Today's vibe"
                className="w-full h-full object-cover"
              />
            </div>
            {todaysVibe.caption && (
              <div className="p-4">
                <p className="text-white/90">{todaysVibe.caption}</p>
              </div>
            )}
          </GlassPanel>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          Share your vibe
        </h1>
        <p className="text-white/60">
          {capturedImage
            ? 'Looking good! Add a caption or retake.'
            : 'Capture a moment from your day'}
        </p>
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassPanel className="bg-red-500/20 border-red-500/30 text-center">
              <p className="text-red-200">{error}</p>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera or Preview */}
      <AnimatePresence mode="wait">
        {capturedImage ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PhotoPreview
              imageBlob={capturedImage}
              onPost={handlePost}
              onRetake={handleRetake}
              isPosting={isPosting}
            />
          </motion.div>
        ) : (
          <motion.div
            key="camera"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <CameraCapture onCapture={handleCapture} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!capturedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-white/40 text-sm">
            Pro tip: Natural light makes the best vibes
          </p>
        </motion.div>
      )}
    </div>
  );
}
