'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUpload, FileUploadResult } from '@/components/capture/FileUpload';
import { MediaPreview } from '@/components/capture/MediaPreview';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useVibes } from '@/hooks/useVibes';
import { api } from '@/lib/api';

export default function CapturePage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<FileUploadResult | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addVibe } = useVibes();

  const handleFileSelect = useCallback((result: FileUploadResult) => {
    setUploadedFile(result);
    setError(null);
  }, []);

  const handleRetake = useCallback(() => {
    setUploadedFile(null);
    setError(null);
  }, []);

  const handlePost = useCallback(
    async (prompt: string) => {
      if (!uploadedFile) return;

      setIsPosting(true);
      setError(null);

      try {
        const { data, error: apiError } = await api.createVideoShot(
          uploadedFile.file,
          prompt,
          undefined
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
          {uploadedFile
            ? 'Add the prompt you used'
            : 'Upload your AI-generated output'}
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
            <GlassPanel className="bg-terminal-error/20 border-terminal-error/30 text-center">
              <p className="text-terminal-error font-mono">{error}</p>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {uploadedFile ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <MediaPreview
              mediaUrl={uploadedFile.previewUrl}
              mediaType={uploadedFile.type}
              onPost={handlePost}
              onRetake={handleRetake}
              isPosting={isPosting}
            />
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <FileUpload onFileSelect={handleFileSelect} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!uploadedFile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-terminal-text-dim text-sm font-mono">
            Supports images and videos up to 50MB
          </p>
        </motion.div>
      )}
    </div>
  );
}
