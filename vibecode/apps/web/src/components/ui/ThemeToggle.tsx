'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-vibe-purple/50',
        isNeumorphic
          ? 'bg-neumorphic-base shadow-neu-inset-sm'
          : 'bg-white/10 backdrop-blur-sm border border-white/20',
        className
      )}
      aria-label={`Switch to ${isNeumorphic ? 'glass' : 'neumorphic'} theme`}
    >
      <motion.div
        className={cn(
          'absolute top-1 w-5 h-5 rounded-full flex items-center justify-center',
          isNeumorphic
            ? 'bg-neumorphic-base shadow-neu-sm'
            : 'bg-gradient-vibe shadow-glow'
        )}
        animate={{
          left: isNeumorphic ? '1.75rem' : '0.25rem',
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        {isNeumorphic ? (
          <svg
            className="w-3 h-3 text-neumorphic-text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        ) : (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        )}
      </motion.div>
    </button>
  );
}
