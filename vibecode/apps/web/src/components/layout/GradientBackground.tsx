'use client';

import { cn } from '@/lib/utils';

export interface GradientBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export function GradientBackground({
  className,
  children,
}: GradientBackgroundProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 min-h-screen overflow-hidden',
        'bg-terminal-bg',
        className
      )}
    >
      {/* Subtle dot pattern for terminal feel */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(217,119,6,0.08) 0%, transparent 60%)',
        }}
      />

      {/* Content */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
