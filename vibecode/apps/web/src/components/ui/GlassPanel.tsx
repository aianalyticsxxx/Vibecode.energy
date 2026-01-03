'use client';

import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';
import { useTheme, type Theme } from '@/hooks/useTheme';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'heavy' | 'subtle';
  blur?: 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  glow?: boolean;
  glowColor?: 'purple' | 'blue' | 'teal';
  forceTheme?: Theme;
}

const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      className,
      variant = 'default',
      blur = 'md',
      padding = 'md',
      rounded = '2xl',
      glow = false,
      glowColor = 'purple',
      forceTheme,
      children,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();
    const effectiveTheme = forceTheme || theme;

    const glassVariants = {
      default: 'bg-glass-white border-glass-border',
      heavy: 'bg-glass-white-lighter border-glass-border',
      subtle: 'bg-glass-white/50 border-glass-border/50',
    };

    const neuVariants = {
      default: 'bg-neumorphic-base shadow-neu',
      heavy: 'bg-neumorphic-base shadow-neu-lg',
      subtle: 'bg-neumorphic-base shadow-neu-sm',
    };

    const blurSizes = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-glass',
      lg: 'backdrop-blur-glass-heavy',
    };

    const paddings = {
      none: '',
      sm: 'p-2 md:p-3',
      md: 'p-4 md:p-6',
      lg: 'p-6 md:p-8',
    };

    const roundedSizes = {
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      full: 'rounded-full',
    };

    const glowColors = {
      purple: 'shadow-glow',
      blue: 'shadow-glow-blue',
      teal: 'shadow-glow-teal',
    };

    const isNeumorphic = effectiveTheme === 'neumorphic';

    return (
      <div
        ref={ref}
        className={cn(
          'transition-all duration-300',
          isNeumorphic
            ? neuVariants[variant]
            : cn(
                'border shadow-glass',
                glassVariants[variant],
                blurSizes[blur],
                glow && glowColors[glowColor]
              ),
          paddings[padding],
          roundedSizes[rounded],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';

export { GlassPanel };
