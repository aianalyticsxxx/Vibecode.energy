'use client';

import { cn } from '@/lib/utils';
import { forwardRef, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTheme, type Theme } from '@/hooks/useTheme';

export interface ButtonProps {
  variant?: 'gradient' | 'glass' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  forceTheme?: Theme;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  form?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'gradient',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      forceTheme,
      children,
      disabled,
      type = 'button',
      onClick,
      form,
    },
    ref
  ) => {
    const { theme } = useTheme();
    const effectiveTheme = forceTheme || theme;

    const glassVariants = {
      gradient:
        'bg-gradient-vibe text-white shadow-glass hover:shadow-glow',
      glass:
        'bg-glass-white text-white border border-glass-border backdrop-blur-glass shadow-glass-sm hover:bg-glass-white-lighter',
      ghost:
        'bg-transparent text-white/80 hover:text-white hover:bg-white/10',
    };

    const neuVariants = {
      gradient:
        'bg-gradient-vibe text-white shadow-neu-sm hover:shadow-neu active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]',
      glass:
        'bg-neumorphic-base text-neumorphic-text shadow-neu-sm hover:shadow-neu active:shadow-neu-inset',
      ghost:
        'bg-transparent text-neumorphic-text hover:bg-neumorphic-dark/10',
    };

    const sizes = {
      sm: 'py-2 px-4 text-sm rounded-lg',
      md: 'py-3 px-6 text-base rounded-xl',
      lg: 'py-4 px-8 text-lg rounded-2xl',
    };

    const isNeumorphic = effectiveTheme === 'neumorphic';
    const currentVariants = isNeumorphic ? neuVariants : glassVariants;

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(
          'font-semibold transition-all duration-150 ease-out',
          'inline-flex items-center justify-center gap-2',
          'focus:outline-none focus:ring-2 focus:ring-vibe-purple/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          currentVariants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        type={type}
        onClick={onClick}
        form={form}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
