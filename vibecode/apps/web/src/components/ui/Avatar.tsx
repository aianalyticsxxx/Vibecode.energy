'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useState } from 'react';
import { useTheme, type Theme } from '@/hooks/useTheme';

export interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
  glowColor?: 'purple' | 'blue' | 'teal';
  className?: string;
  onClick?: () => void;
  forceTheme?: Theme;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

const glowColors = {
  purple: 'ring-vibe-purple/50 shadow-glow',
  blue: 'ring-vibe-blue/50 shadow-glow-blue',
  teal: 'ring-vibe-teal/50 shadow-glow-teal',
};

export function Avatar({
  src,
  alt,
  size = 'md',
  glow = false,
  glowColor = 'purple',
  className,
  onClick,
  forceTheme,
}: AvatarProps) {
  const [error, setError] = useState(false);
  const { theme } = useTheme();
  const effectiveTheme = forceTheme || theme;

  const initials = alt
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isNeumorphic = effectiveTheme === 'neumorphic';

  const baseClasses = cn(
    'relative rounded-full overflow-hidden flex-shrink-0',
    sizeClasses[size],
    isNeumorphic
      ? 'bg-neumorphic-base shadow-neu-sm'
      : cn('bg-gradient-vibe', glow && `ring-2 ${glowColors[glowColor]}`),
    onClick && 'cursor-pointer transition-transform hover:scale-105',
    className
  );

  const textColorClass = isNeumorphic ? 'text-neumorphic-text' : 'text-white';

  if (!src || error) {
    return (
      <div className={baseClasses} onClick={onClick}>
        <div className={cn('absolute inset-0 flex items-center justify-center font-semibold', textColorClass)}>
          <span
            className={cn(
              size === 'xs' && 'text-[8px]',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base',
              size === 'xl' && 'text-xl'
            )}
          >
            {initials}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={baseClasses} onClick={onClick}>
      <Image
        src={src}
        alt={alt}
        width={sizeMap[size]}
        height={sizeMap[size]}
        className="object-cover w-full h-full"
        onError={() => setError(true)}
      />
    </div>
  );
}
