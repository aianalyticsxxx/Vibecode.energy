'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DualCapture, DualCaptureResult } from '@/components/capture/DualCapture';
import { DualPhotoPreview } from '@/components/capture/DualPhotoPreview';
import { FileUpload, FileUploadResult } from '@/components/capture/FileUpload';
import { VideoPreview } from '@/components/capture/VideoPreview';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useVibes } from '@/hooks/useVibes';
import { api } from '@/lib/api';

type CaptureMode = 'capture' | 'upload';

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
  const [captureMode, setCaptureMode] = useState<CaptureMode>('capture');
  const [capturedPhotos, setCapturedPhotos] = useState<DualCaptureResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<FileUploadResult | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addVibe } = useVibes();

  const handleCapture = useCallback((result: DualCaptureResult) => {
    setCapturedPhotos(result);
    setError(null);
  }, []);

  const handleFileSelect = useCallback((result: FileUploadResult) => {
    setUploadedFile(result);
    setError(null);
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedPhotos(null);
    setUploadedFile(null);
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

        // Vertical layout: prompt on top, result below
        const maxWidth = 1920;
        const padding = 16;
        const separatorHeight = 40;
        const labelHeight = 32;

        // Scale images to fit max width
        const promptScale = Math.min(1, maxWidth / promptImg.width);
        const resultScale = Math.min(1, maxWidth / resultImg.width);

        const scaledPromptWidth = promptImg.width * promptScale;
        const scaledPromptHeight = promptImg.height * promptScale;
        const scaledResultWidth = resultImg.width * resultScale;
        const scaledResultHeight = resultImg.height * resultScale;

        // Canvas width is the max of both scaled images
        const canvasWidth = Math.max(scaledPromptWidth, scaledResultWidth);
        // Canvas height: prompt + separator + result
        const totalHeight = scaledPromptHeight + separatorHeight + scaledResultHeight;

        canvas.width = canvasWidth;
        canvas.height = totalHeight;

        console.log('Creating vertical composite:', {
          canvasWidth,
          totalHeight,
          scaledPromptHeight,
          scaledResultHeight,
        });

        // Fill background with terminal dark color
        ctx.fillStyle = '#0D0D0D';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw prompt image at top (centered if narrower than canvas)
        const promptX = (canvasWidth - scaledPromptWidth) / 2;
        ctx.drawImage(promptImg, promptX, 0, scaledPromptWidth, scaledPromptHeight);

        // Draw prompt label overlay at bottom of prompt
        ctx.save();
        ctx.fillStyle = 'rgba(217, 119, 6, 0.9)'; // terminal-accent (orange)
        drawRoundedRect(ctx, padding, scaledPromptHeight - labelHeight - padding, 120, labelHeight, 6);
        ctx.fill();
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillStyle = '#F5F5F5';
        ctx.fillText('$ prompt', padding + 12, scaledPromptHeight - padding - 10);
        ctx.restore();

        // Draw separator bar
        const separatorY = scaledPromptHeight;
        ctx.fillStyle = '#171717'; // terminal-bg-elevated
        ctx.fillRect(0, separatorY, canvasWidth, separatorHeight);

        // Draw separator line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; // terminal-border
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, separatorY);
        ctx.lineTo(canvasWidth, separatorY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, separatorY + separatorHeight);
        ctx.lineTo(canvasWidth, separatorY + separatorHeight);
        ctx.stroke();

        // Draw result image below separator (centered if narrower than canvas)
        const resultX = (canvasWidth - scaledResultWidth) / 2;
        const resultY = separatorY + separatorHeight;
        ctx.drawImage(resultImg, resultX, resultY, scaledResultWidth, scaledResultHeight);

        // Draw result label overlay at top of result
        ctx.save();
        ctx.fillStyle = 'rgba(34, 197, 94, 0.9)'; // terminal-success (green)
        drawRoundedRect(ctx, padding, resultY + padding, 120, labelHeight, 6);
        ctx.fill();
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillStyle = '#F5F5F5';
        ctx.fillText('> output', padding + 12, resultY + padding + 22);
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

  // Handle video/image file upload post
  const handleVideoPost = useCallback(
    async (prompt: string, caption: string) => {
      if (!uploadedFile) return;

      setIsPosting(true);
      setError(null);

      try {
        const { data, error: apiError } = await api.createVideoShot(
          uploadedFile.file,
          prompt,
          caption || undefined
        );

        if (apiError) {
          setError(apiError.message);
          return;
        }

        if (data) {
          addVibe(data);
          router.push('/feed');
        }
      } catch (err) {
        console.error('Failed to upload:', err);
        setError('Failed to share. Please try again.');
      } finally {
        setIsPosting(false);
      }
    },
    [uploadedFile, addVibe, router]
  );

  // Determine what content is ready to preview
  const hasContent = capturedPhotos || uploadedFile;
  const isVideoUpload = uploadedFile?.type === 'video';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold text-terminal-text font-mono mb-2">
          Share your shot
        </h1>
        <p className="text-terminal-text-secondary font-mono text-sm">
          {hasContent
            ? isVideoUpload
              ? 'Add a prompt for your video'
              : 'Nice result! Add a caption or retake.'
            : captureMode === 'capture'
              ? 'Capture prompt → then the result'
              : 'Upload an image or video'}
        </p>
      </motion.div>

      {/* Mode toggle - only show when no content captured yet */}
      {!hasContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center gap-2"
        >
          <button
            onClick={() => setCaptureMode('capture')}
            className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
              captureMode === 'capture'
                ? 'bg-terminal-accent/20 border-terminal-accent text-terminal-accent'
                : 'border-terminal-border text-terminal-text-secondary hover:text-terminal-text hover:border-terminal-border-bright'
            }`}
          >
            --capture
          </button>
          <button
            onClick={() => setCaptureMode('upload')}
            className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
              captureMode === 'upload'
                ? 'bg-terminal-accent/20 border-terminal-accent text-terminal-accent'
                : 'border-terminal-border text-terminal-text-secondary hover:text-terminal-text hover:border-terminal-border-bright'
            }`}
          >
            --upload
          </button>
        </motion.div>
      )}

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassPanel className="bg-terminal-error/20 border-terminal-error/30 text-center">
              <p className="text-terminal-error font-mono">{error}</p>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {/* Screenshot captured - show preview */}
        {capturedPhotos && (
          <motion.div
            key="screenshot-preview"
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
        )}

        {/* Video uploaded - show video preview */}
        {uploadedFile?.type === 'video' && (
          <motion.div
            key="video-preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <VideoPreview
              videoUrl={uploadedFile.previewUrl}
              onPost={handleVideoPost}
              onRetake={handleRetake}
              isPosting={isPosting}
            />
          </motion.div>
        )}

        {/* Image uploaded - for now, show same as video but could be different */}
        {uploadedFile?.type === 'image' && (
          <motion.div
            key="image-preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <VideoPreview
              videoUrl={uploadedFile.previewUrl}
              onPost={handleVideoPost}
              onRetake={handleRetake}
              isPosting={isPosting}
            />
          </motion.div>
        )}

        {/* No content yet - show capture or upload UI */}
        {!hasContent && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {captureMode === 'capture' ? (
              <DualCapture onCapture={handleCapture} />
            ) : (
              <FileUpload onFileSelect={handleFileSelect} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!hasContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-terminal-text-dim text-sm font-mono">
            {captureMode === 'capture'
              ? 'Screenshot the prompt, then the result'
              : 'Supports images and videos up to 50MB'}
          </p>
        </motion.div>
      )}
    </div>
  );
}
