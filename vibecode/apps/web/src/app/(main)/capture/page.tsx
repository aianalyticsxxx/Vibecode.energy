'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DualCapture, DualCaptureResult } from '@/components/capture/DualCapture';
import { DualPhotoPreview } from '@/components/capture/DualPhotoPreview';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useVibes } from '@/hooks/useVibes';
import { api } from '@/lib/api';

// Cross-browser rounded rectangle helper (ctx.roundRect is not supported in all browsers)
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
  ctx.lineTo(x + radius, y + height);
  ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + radius);
  ctx.arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2);
  ctx.closePath();
}

export default function CapturePage() {
  const router = useRouter();
  const [capturedPhotos, setCapturedPhotos] = useState<DualCaptureResult | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addVibe } = useVibes();

  const handleCapture = useCallback((result: DualCaptureResult) => {
    setCapturedPhotos(result);
    setError(null);
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedPhotos(null);
    setError(null);
  }, []);

  const handlePost = useCallback(
    async (caption: string) => {
      if (!capturedPhotos) return;

      setIsPosting(true);
      setError(null);

      try {
        // Combine prompt (small overlay) and result (large background) into a single image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to create canvas context');
        }

        // Load both images
        const resultImg = new Image();    // Large background - the result
        const promptImg = new Image();    // Small overlay - the prompt

        const resultUrl = URL.createObjectURL(capturedPhotos.result);
        const promptUrl = URL.createObjectURL(capturedPhotos.prompt);

        await Promise.all([
          new Promise<void>((resolve, reject) => {
            resultImg.onload = () => {
              console.log('Result loaded:', resultImg.width, 'x', resultImg.height);
              resolve();
            };
            resultImg.onerror = (e) => {
              console.error('Result load error:', e);
              reject(e);
            };
            resultImg.src = resultUrl;
          }),
          new Promise<void>((resolve, reject) => {
            promptImg.onload = () => {
              console.log('Prompt loaded:', promptImg.width, 'x', promptImg.height);
              resolve();
            };
            promptImg.onerror = (e) => {
              console.error('Prompt load error:', e);
              reject(e);
            };
            promptImg.src = promptUrl;
          }),
        ]);

        console.log('Both images loaded, creating composite...');

        // Validate images have actual dimensions
        if (promptImg.width === 0 || promptImg.height === 0) {
          throw new Error('Prompt screenshot has zero dimensions');
        }
        if (resultImg.width === 0 || resultImg.height === 0) {
          throw new Error('Result screenshot has zero dimensions');
        }

        // Set canvas size to result dimensions (or max 1920px)
        const maxWidth = 1920;
        const scale = Math.min(1, maxWidth / resultImg.width);
        canvas.width = resultImg.width * scale;
        canvas.height = resultImg.height * scale;

        // Draw result as background (the larger image showing the output)
        ctx.drawImage(resultImg, 0, 0, canvas.width, canvas.height);

        // Draw prompt in top-left corner (overlay showing the input)
        // Prompt is 35% of canvas - visible but result is still the main focus
        const overlaySize = Math.min(canvas.width, canvas.height) * 0.35; // 35% - bigger to show the prompt clearly
        const overlayMargin = 24;
        const overlayX = overlayMargin;
        const overlayY = overlayMargin;
        const radius = 16;

        console.log('Drawing prompt overlay:', {
          overlaySize,
          overlayX,
          overlayY,
          promptImgWidth: promptImg.width,
          promptImgHeight: promptImg.height,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });

        // Draw shadow behind prompt overlay
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = 'black';
        drawRoundedRect(ctx, overlayX, overlayY, overlaySize, overlaySize, radius);
        ctx.fill();
        ctx.restore();

        // Draw prompt with rounded corners
        ctx.save();
        drawRoundedRect(ctx, overlayX, overlayY, overlaySize, overlaySize, radius);
        ctx.clip();

        // Calculate crop to fit square (center crop)
        const promptAspect = promptImg.width / promptImg.height;
        let sx = 0, sy = 0, sw = promptImg.width, sh = promptImg.height;
        if (promptAspect > 1) {
          sw = promptImg.height;
          sx = (promptImg.width - sw) / 2;
        } else {
          sh = promptImg.width;
          sy = (promptImg.height - sh) / 2;
        }

        ctx.drawImage(promptImg, sx, sy, sw, sh, overlayX, overlayY, overlaySize, overlaySize);
        console.log('Prompt drawn to canvas at', overlayX, overlayY, 'size', overlaySize);
        ctx.restore();

        // Add purple border around prompt (to indicate it's the input)
        ctx.strokeStyle = '#9333ea'; // purple-600 (vibe-purple)
        ctx.lineWidth = 4;
        drawRoundedRect(ctx, overlayX, overlayY, overlaySize, overlaySize, radius);
        ctx.stroke();

        // Add small "PROMPT" label
        ctx.save();
        ctx.font = 'bold 14px system-ui, sans-serif';
        const labelWidth = ctx.measureText('💬 PROMPT').width + 12;
        const labelHeight = 22;
        const labelX = overlayX;
        const labelY = overlayY + overlaySize + 6;

        // Label background
        ctx.fillStyle = 'rgba(147, 51, 234, 0.9)'; // purple-600
        drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 6);
        ctx.fill();

        // Label text
        ctx.fillStyle = 'white';
        ctx.fillText('💬 PROMPT', labelX + 6, labelY + 16);
        ctx.restore();

        // Clean up URLs
        URL.revokeObjectURL(resultUrl);
        URL.revokeObjectURL(promptUrl);

        console.log('Canvas composite created:', canvas.width, 'x', canvas.height);

        // Convert canvas to blob
        const combinedBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              console.log('Combined blob created, size:', blob.size);
              resolve(blob);
            } else {
              reject(new Error('Failed to create image'));
            }
          }, 'image/jpeg', 0.9);
        });

        const file = new File([combinedBlob], 'shot.jpg', {
          type: 'image/jpeg',
        });
        console.log('File created for upload:', file.name, file.size);

        // For now, use the legacy createVibe which maps to createShot
        const { data, error: apiError } = await api.createVibe(file, caption);

        if (apiError) {
          setError(apiError.message);
          return;
        }

        if (data) {
          // Optimistically update state
          addVibe(data);

          // Redirect to feed
          router.push('/feed');
        }
      } catch (err) {
        console.error('Failed to post shot:', err);
        setError('Failed to share your shot. Please try again.');
      } finally {
        setIsPosting(false);
      }
    },
    [capturedPhotos, addVibe, router]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          Share your shot
        </h1>
        <p className="text-white/60">
          {capturedPhotos
            ? 'Nice result! Add a caption or retake.'
            : 'Capture prompt → then the result'}
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

      {/* Dual Capture or Preview */}
      <AnimatePresence mode="wait">
        {capturedPhotos ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DualPhotoPreview
              photos={capturedPhotos}
              onPost={handlePost}
              onRetake={handleRetake}
              isPosting={isPosting}
            />
          </motion.div>
        ) : (
          <motion.div
            key="capture"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <DualCapture onCapture={handleCapture} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!capturedPhotos && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-white/40 text-sm">
            Show the prompt 💬 → then the result ✨
          </p>
        </motion.div>
      )}
    </div>
  );
}
