'use client';

import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export interface BottomNavProps {
  className?: string;
}

const navItems = [
  {
    href: '/capture',
    label: 'Capture',
    icon: (active: boolean, isNeumorphic: boolean) => (
      <svg
        className={cn('w-6 h-6', active ? 'text-vibe-purple' : isNeumorphic ? 'text-neumorphic-text-secondary' : 'text-white/60')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    href: '/feed',
    label: 'Feed',
    icon: (active: boolean, isNeumorphic: boolean) => (
      <svg
        className={cn('w-6 h-6', active ? 'text-vibe-purple' : isNeumorphic ? 'text-neumorphic-text-secondary' : 'text-white/60')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (active: boolean, isNeumorphic: boolean) => (
      <svg
        className={cn('w-6 h-6', active ? 'text-vibe-purple' : isNeumorphic ? 'text-neumorphic-text-secondary' : 'text-white/60')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  const getHref = (href: string) => {
    if (href === '/profile' && user) {
      return `/profile/${user.username}`;
    }
    return href;
  };

  const isActive = (href: string) => {
    if (href === '/profile') {
      return pathname.startsWith('/profile');
    }
    return pathname === href;
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        isNeumorphic
          ? 'bg-neumorphic-base shadow-[0_-4px_16px_rgba(163,177,198,0.3)]'
          : 'bg-glass-white/90 backdrop-blur-glass-heavy border-t border-glass-border',
        'safe-bottom',
        className
      )}
    >
      <div className="max-w-lg mx-auto px-4 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={getHref(item.href)}
                className={cn(
                  'relative flex flex-col items-center py-2 px-4 rounded-xl transition-shadow',
                  isNeumorphic && active && 'shadow-neu-inset-sm'
                )}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="relative"
                >
                  {item.icon(active, isNeumorphic)}
                  {active && !isNeumorphic && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-vibe-purple rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.div>
                <span
                  className={cn(
                    'text-xs mt-1 transition-colors',
                    active ? 'text-vibe-purple font-medium' : isNeumorphic ? 'text-neumorphic-text-secondary' : 'text-white/50'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
