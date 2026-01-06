'use client';

import { useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';

export interface DualCaptureResult {
  prompt: Blob;   // First screenshot - the prompt/input (shown smaller)
  result: Blob;   // Second screenshot - the result/output (shown larger as background)
}

export interface DualCaptureProps {
  onCapture: (result: DualCaptureResult) => void;
  className?: string;
}

type CaptureStep = 'ready' | 'capturing_prompt' | 'prompt_captured' | 'capturing_result' | 'complete';

export function DualCapture({ onCapture, className }: DualCaptureProps) {
  const [step, setStep] = useState<CaptureStep>('ready');
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptBlob, setPromptBlob] = useState<Blob | null>(null);
  const [promptPreviewUrl, setPromptPreviewUrl] = useState<string | null>(null);

  // Capture screenshot using Screen Capture API
  const captureScreenshot = useCallback((label: string): Promise<Blob | null> => {
    return new Promise(async (resolve) => {
      try {
        // Request screen capture permission
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
          },
          audio: false,
        });

        // Create video element to capture frame
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        // Wait for the screen share picker to fully close
        await new Promise(r => setTimeout(r, 500));

        // Capture frame to canvas
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0);

          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());

          // Convert to blob
          canvas.toBlob((blob) => {
            console.log(`${label} captured:`, blob?.size);
            resolve(blob);
          }, 'image/jpeg', 0.9);
        } else {
          stream.getTracks().forEach(track => track.stop());
          resolve(null);
        }
      } catch (err) {
        console.error(`${label} capture error:`, err);
        resolve(null);
      }
    });
  }, []);

  // Step 1: Capture the prompt screenshot
  const capturePrompt = useCallback(async () => {
    setError(null);
    setStep('capturing_prompt');
    setIsCapturing(true);

    try {
      const blob = await captureScreenshot('Prompt');

      if (!blob) {
        setError('Screen sharing was denied. Please allow screen capture.');
        setStep('ready');
        setIsCapturing(false);
        return;
      }

      // Store the prompt and show preview
      setPromptBlob(blob);
      setPromptPreviewUrl(URL.createObjectURL(blob));
      setStep('prompt_captured');
      setIsCapturing(false);
    } catch (err) {
      console.error('Prompt capture error:', err);
      setError('Failed to capture prompt. Please try again.');
      setStep('ready');
      setIsCapturing(false);
    }
  }, [captureScreenshot]);

  // Step 2: Capture the result screenshot
  const captureResult = useCallback(async () => {
    if (!promptBlob) {
      setError('Please capture the prompt first.');
      return;
    }

    setError(null);
    setStep('capturing_result');
    setIsCapturing(true);

    try {
      const resultBlob = await captureScreenshot('Result');

      if (!resultBlob) {
        setError('Screen sharing was denied. Please allow screen capture.');
        setStep('prompt_captured');
        setIsCapturing(false);
        return;
      }

      // Flash effect
      setTimeout(() => setIsCapturing(false), 200);

      // Success! Call onCapture with both screenshots
      onCapture({ prompt: promptBlob, result: resultBlob });
      setStep('complete');
    } catch (err) {
      console.error('Result capture error:', err);
      setError('Failed to capture result. Please try again.');
      setStep('prompt_captured');
      setIsCapturing(false);
    }
  }, [captureScreenshot, promptBlob, onCapture]);

  // Reset to start over
  const resetCapture = useCallback(() => {
    if (promptPreviewUrl) {
      URL.revokeObjectURL(promptPreviewUrl);
    }
    setPromptBlob(null);
    setPromptPreviewUrl(null);
    setStep('ready');
    setError(null);
  }, [promptPreviewUrl]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
          step === 'ready' || step === 'capturing_prompt'
            ? 'bg-vibe-purple/30 text-vibe-purple-light border border-vibe-purple/50'
            : step === 'prompt_captured' || step === 'capturing_result' || step === 'complete'
              ? 'bg-green-500/30 text-green-300 border border-green-500/50'
              : 'bg-white/10 text-white/50'
        )}>
          <span className="w-5 h-5 rounded-full bg-current/30 flex items-center justify-center text-xs">1</span>
          <span>Prompt</span>
          {(step === 'prompt_captured' || step === 'capturing_result' || step === 'complete') && <span>✓</span>}
        </div>
        <div className="w-8 h-0.5 bg-white/20" />
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
          step === 'prompt_captured' || step === 'capturing_result'
            ? 'bg-vibe-purple/30 text-vibe-purple-light border border-vibe-purple/50'
            : step === 'complete'
              ? 'bg-green-500/30 text-green-300 border border-green-500/50'
              : 'bg-white/10 text-white/50'
        )}>
          <span className="w-5 h-5 rounded-full bg-current/30 flex items-center justify-center text-xs">2</span>
          <span>Result</span>
          {step === 'complete' && <span>✓</span>}
        </div>
      </div>

      <div className="relative">
        {/* Preview area */}
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
          {/* Prompt preview (when captured) */}
          {promptPreviewUrl && (
            <div className="absolute inset-0">
              <img
                src={promptPreviewUrl}
                alt="Prompt"
                className="w-full h-full object-contain"
              />
              {/* Overlay showing this will be the small one */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="bg-black/70 px-4 py-2 rounded-lg text-center">
                  <p className="text-white/80 text-sm">Prompt captured</p>
                  <p className="text-white/50 text-xs">This will be the small overlay</p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!promptPreviewUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-white/60 text-center px-4">
                Capture a screenshot of your <span className="text-vibe-purple-light font-semibold">prompt</span>
              </p>
            </div>
          )}

          {/* Capture flash effect */}
          <AnimatePresence>
            {isCapturing && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-white z-20"
              />
            )}
          </AnimatePresence>

          {/* Corner guides */}
          <div className="absolute inset-4 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/50 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/50 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/50 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/50 rounded-br-lg" />
          </div>

          {/* Status badge */}
          <div className="absolute top-2 left-2 bg-black/50 px-3 py-1.5 rounded-full flex items-center gap-2">
            {step === 'ready' && (
              <>
                <span className="w-2 h-2 rounded-full bg-vibe-purple" />
                <span className="text-xs text-white">Step 1: Capture Prompt</span>
              </>
            )}
            {step === 'capturing_prompt' && (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs text-white">Capturing...</span>
              </>
            )}
            {step === 'prompt_captured' && (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-white">Step 2: Capture Result</span>
              </>
            )}
            {step === 'capturing_result' && (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs text-white">Capturing result...</span>
              </>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-red-500/20 border border-red-500/30 rounded-lg p-3"
          >
            <p className="text-red-200 text-sm text-center">{error}</p>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mt-6">
          {/* Reset button (when prompt is captured) */}
          {step === 'prompt_captured' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={resetCapture}
              className="w-12 h-12 rounded-full bg-glass-white backdrop-blur-glass border border-glass-border flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </motion.button>
          )}

          {/* Spacer when no reset button */}
          {step !== 'prompt_captured' && <div className="w-12 h-12" />}

          {/* Main capture button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={step === 'prompt_captured' ? captureResult : capturePrompt}
            disabled={isCapturing}
            className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-glow disabled:opacity-50"
          >
            {isCapturing ? (
              <div className="w-16 h-16 rounded-full bg-gradient-vibe flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <motion.div
                  className={cn(
                    "w-16 h-16 rounded-full",
                    step === 'prompt_captured' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-vibe'
                  )}
                  whileHover={{ scale: 1.05 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">{step === 'prompt_captured' ? '✨' : '💬'}</span>
                </div>
              </>
            )}
          </motion.button>

          {/* Placeholder for symmetry */}
          <div className="w-12 h-12" />
        </div>

        {/* Instruction text */}
        <p className="text-center text-white/50 text-sm mt-4">
          {step === 'ready' && 'Tap to capture your prompt screenshot'}
          {step === 'capturing_prompt' && 'Select the window with your prompt...'}
          {step === 'prompt_captured' && 'Now capture the result!'}
          {step === 'capturing_result' && 'Select the window with the result...'}
        </p>
      </div>
    </div>
  );
}
