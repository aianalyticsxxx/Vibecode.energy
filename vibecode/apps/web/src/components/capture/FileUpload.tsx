'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export interface FileUploadResult {
  file: File;
  type: 'image' | 'video';
  previewUrl: string;
}

export interface FileUploadProps {
  onFileSelect: (result: FileUploadResult) => void;
  className?: string;
}

const ACCEPTED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function FileUpload({ onFileSelect, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndProcess = (file: File) => {
    setError(null);

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 50MB.');
      return;
    }

    // Determine file type
    let type: 'image' | 'video' | null = null;
    if (ACCEPTED_TYPES.image.includes(file.type)) {
      type = 'image';
    } else if (ACCEPTED_TYPES.video.includes(file.type)) {
      type = 'video';
    }

    if (!type) {
      setError('Unsupported file type. Use JPEG, PNG, GIF, MP4, or WebM.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onFileSelect({ file, type, previewUrl });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndProcess(file);
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED_TYPES.image, ...ACCEPTED_TYPES.video].join(',')}
        onChange={handleChange}
        className="hidden"
      />

      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all
          ${isDragging
            ? 'border-terminal-accent bg-terminal-accent/10'
            : 'border-terminal-border hover:border-terminal-accent/50 hover:bg-terminal-bg-elevated'
          }
        `}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="space-y-4">
          {/* Upload icon */}
          <div className="flex justify-center">
            <svg
              className={`w-12 h-12 ${isDragging ? 'text-terminal-accent' : 'text-terminal-text-secondary'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>

          {/* Text */}
          <div className="space-y-1">
            <p className="font-mono text-terminal-text">
              <span className="text-terminal-accent">$</span> upload --file
            </p>
            <p className="text-sm text-terminal-text-secondary font-mono">
              {isDragging ? 'Drop file here' : 'Click or drag file to upload'}
            </p>
          </div>

          {/* Supported formats */}
          <div className="flex flex-wrap justify-center gap-2 text-xs font-mono text-terminal-text-dim">
            <span className="px-2 py-1 rounded bg-terminal-bg-elevated border border-terminal-border">
              .jpg
            </span>
            <span className="px-2 py-1 rounded bg-terminal-bg-elevated border border-terminal-border">
              .png
            </span>
            <span className="px-2 py-1 rounded bg-terminal-bg-elevated border border-terminal-border">
              .mp4
            </span>
            <span className="px-2 py-1 rounded bg-terminal-bg-elevated border border-terminal-border">
              .webm
            </span>
          </div>

          <p className="text-xs text-terminal-text-dim font-mono">
            Max 50MB
          </p>
        </div>
      </motion.div>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-terminal-error font-mono"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
