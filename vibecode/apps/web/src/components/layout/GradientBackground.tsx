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
        'bg-black',
        className
      )}
    >
      {/* Subtle noise texture for depth */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
