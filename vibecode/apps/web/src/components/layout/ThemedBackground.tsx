'use client';

import { useTheme } from '@/hooks/useTheme';
import { GradientBackground } from './GradientBackground';
import { NeumorphicBackground } from './NeumorphicBackground';

export interface ThemedBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export function ThemedBackground({ className, children }: ThemedBackgroundProps) {
  const { theme } = useTheme();

  if (theme === 'neumorphic') {
    return (
      <NeumorphicBackground className={className}>
        {children}
      </NeumorphicBackground>
    );
  }

  return (
    <GradientBackground className={className} animated>
      {children}
    </GradientBackground>
  );
}
