'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface GradientBackgroundProps {
  className?: string;
  animated?: boolean;
  children?: React.ReactNode;
}

export function GradientBackground({
  className,
  animated = true,
  children,
}: GradientBackgroundProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 min-h-screen overflow-hidden',
        'bg-slate-900',
        className
      )}
    >
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Purple orb - top left */}
        <motion.div
          className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-vibe-purple/30 blur-[100px]"
          animate={
            animated
              ? {
                  x: [0, 50, 0],
                  y: [0, 30, 0],
                  scale: [1, 1.1, 1],
                }
              : {}
          }
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Blue orb - center right */}
        <motion.div
          className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-vibe-blue/25 blur-[120px]"
          animate={
            animated
              ? {
                  x: [0, -40, 0],
                  y: [0, 50, 0],
                  scale: [1, 1.2, 1],
                }
              : {}
          }
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />

        {/* Teal orb - bottom center */}
        <motion.div
          className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-vibe-teal/20 blur-[100px]"
          animate={
            animated
              ? {
                  x: [0, 60, 0],
                  y: [0, -40, 0],
                  scale: [1, 1.15, 1],
                }
              : {}
          }
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />

        {/* Additional small orbs for depth */}
        <motion.div
          className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-vibe-purple/15 blur-[80px]"
          animate={
            animated
              ? {
                  x: [0, 30, 0],
                  y: [0, -30, 0],
                }
              : {}
          }
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        />

        <motion.div
          className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full bg-vibe-blue/10 blur-[90px]"
          animate={
            animated
              ? {
                  x: [0, -20, 0],
                  y: [0, 40, 0],
                }
              : {}
          }
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1.5,
          }}
        />
      </div>

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
