'use client';

import { useState, useEffect, useCallback, RefObject, useRef } from 'react';

export interface UseCameraReturn {
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  isReady: boolean;
  stream: MediaStream | null;
  retryPermission: () => void;
  restartCamera: () => void;
}

export function useCamera(
  videoRef: RefObject<HTMLVideoElement | null>,
  facingMode: 'user' | 'environment' = 'user'
): UseCameraReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Use ref to track current stream to avoid stale closure issues
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsReady(false);

    try {
      // Stop any existing stream using ref (avoids stale closure)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Also clear video srcObject
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      // Set stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Wait for video to actually start playing
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current;
          if (!video) {
            reject(new Error('Video element not found'));
            return;
          }

          // If already playing, resolve immediately
          if (!video.paused && video.readyState >= 2) {
            resolve();
            return;
          }

          const timeoutId = setTimeout(() => {
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('loadeddata', onLoaded);
            video.removeEventListener('error', onError);
            // Resolve anyway after timeout - video might be ready
            resolve();
          }, 3000);

          const onPlaying = () => {
            clearTimeout(timeoutId);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('loadeddata', onLoaded);
            video.removeEventListener('error', onError);
            resolve();
          };

          const onLoaded = () => {
            // Try to play when data is loaded
            video.play().catch(() => {});
          };

          const onError = () => {
            clearTimeout(timeoutId);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('loadeddata', onLoaded);
            video.removeEventListener('error', onError);
            reject(new Error('Video failed to play'));
          };

          video.addEventListener('playing', onPlaying);
          video.addEventListener('loadeddata', onLoaded);
          video.addEventListener('error', onError);

          video.play().catch(() => {
            // Play might fail, but loadeddata listener will retry
          });
        });

        setIsReady(true);
      }

      setStream(mediaStream);
      setHasPermission(true);
      setError(null);
    } catch (err) {
      console.error('Camera error:', err);

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          // Check if it's a system-level denial vs browser-level
          const errorMessage = err.message?.toLowerCase() || '';
          if (errorMessage.includes('system') || errorMessage.includes('permission denied by system')) {
            setError('Camera blocked by your system. On Mac: System Settings → Privacy & Security → Camera → Enable your browser.');
          } else {
            setError('Camera permission was denied. Please allow camera access in your browser settings.');
          }
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is in use by another application. Please close other apps using the camera.');
        } else if (err.name === 'OverconstrainedError') {
          setError('Camera does not support the requested settings.');
        } else {
          setError('Unable to access camera. Please try again.');
        }
      } else {
        setError('An unexpected error occurred.');
      }

      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, videoRef]);

  const retryPermission = useCallback(() => {
    startCamera();
  }, [startCamera]);

  // Restart camera (useful after screen capture disrupts the stream)
  const restartCamera = useCallback(() => {
    // Small delay to let browser clean up screen capture resources
    setTimeout(() => {
      startCamera();
    }, 100);
  }, [startCamera]);

  // Start camera on mount and when facing mode changes
  useEffect(() => {
    startCamera();

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Handle visibility change (pause/resume when tab is hidden/visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause video when tab is hidden
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } else {
        // Resume video when tab is visible
        if (videoRef.current && streamRef.current) {
          videoRef.current.play().catch(console.error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [videoRef]);

  return {
    isLoading,
    error,
    hasPermission,
    isReady,
    stream,
    retryPermission,
    restartCamera,
  };
}
