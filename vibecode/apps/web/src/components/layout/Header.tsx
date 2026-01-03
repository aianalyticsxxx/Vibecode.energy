'use client';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import Link from 'next/link';
import { motion } from 'framer-motion';

export interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        isNeumorphic
          ? 'bg-neumorphic-base shadow-neu-sm'
          : 'bg-glass-white/80 backdrop-blur-glass border-b border-glass-border',
        'safe-top',
        className
      )}
    >
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2">
          <motion.div
            className="text-2xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            ✨
          </motion.div>
          <span className={cn(
            'font-bold text-xl',
            isNeumorphic ? 'text-neumorphic-text' : 'gradient-text'
          )}>VibeCode Energy</span>
        </Link>

        {/* Theme Toggle & User Avatar */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user && (
            <Link href={`/profile/${user.username}`}>
              <Avatar
                src={user.avatarUrl}
                alt={user.displayName}
                size="sm"
                glow={!isNeumorphic}
                glowColor="purple"
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
