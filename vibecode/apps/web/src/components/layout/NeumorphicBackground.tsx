'use client';

import { cn } from '@/lib/utils';

export interface NeumorphicBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export function NeumorphicBackground({
  className,
  children,
}: NeumorphicBackgroundProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 min-h-screen overflow-hidden',
        'bg-neumorphic-base text-neumorphic-text',
        className
      )}
    >
      {/* Subtle gradient overlays for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(59, 130, 246, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(20, 184, 166, 0.02) 0%, transparent 60%)
          `,
        }}
      />

      {/* Soft inner shadow at edges for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 150px rgba(163, 177, 198, 0.2)',
        }}
      />

      {/* Content */}
      {children}
    </div>
  );
}
