'use client';

import { useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { useCamera } from '@/hooks/useCamera';

export interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  className?: string;
}

export function CameraCapture({ onCapture, className }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const { isLoading, error, hasPermission, retryPermission } = useCamera(
    videoRef,
    facingMode
  );

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip horizontally if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Trigger capture animation
    setIsCapturing(true);
    setTimeout(() => setIsCapturing(false), 200);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
        }
      },
      'image/jpeg',
      0.9
    );
  }, [facingMode, onCapture]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  if (error || !hasPermission) {
    return (
      <GlassPanel className={cn('p-8 text-center', className)}>
        <div className="text-4xl mb-4">📷</div>
        <h3 className="text-xl font-semibold text-white mb-2">Camera Access Required</h3>
        <p className="text-white/60 mb-6">
          {error || 'Please allow camera access to share your vibe'}
        </p>
        <Button onClick={retryPermission} variant="gradient">
          Try Again
        </Button>
      </GlassPanel>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Camera viewfinder */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="w-8 h-8 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'w-full h-full object-cover',
            facingMode === 'user' && 'scale-x-[-1]'
          )}
        />

        {/* Capture flash effect */}
        <AnimatePresence>
          {isCapturing && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-white"
            />
          )}
        </AnimatePresence>

        {/* Corner guides */}
        <div className="absolute inset-4 pointer-events-none">
          {/* Top left */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/50 rounded-tl-lg" />
          {/* Top right */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/50 rounded-tr-lg" />
          {/* Bottom left */}
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/50 rounded-bl-lg" />
          {/* Bottom right */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/50 rounded-br-lg" />
        </div>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mt-6">
        {/* Flip camera button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleCamera}
          className="w-12 h-12 rounded-full bg-glass-white backdrop-blur-glass border border-glass-border flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </motion.button>

        {/* Capture button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleCapture}
          className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-glow"
        >
          <motion.div
            className="w-16 h-16 rounded-full bg-gradient-vibe"
            whileHover={{ scale: 1.05 }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">✨</span>
          </div>
        </motion.button>

        {/* Placeholder for balance */}
        <div className="w-12 h-12" />
      </div>
    </div>
  );
}
