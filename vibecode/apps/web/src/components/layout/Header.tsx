'use client';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-black/95 backdrop-blur-sm border-b border-bereal-gray-light',
        'safe-top',
        className
      )}
    >
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="font-black text-xl text-white">VibeCode</span>
        </Link>

        {/* User Avatar */}
        <div className="flex items-center gap-3">
          {user && (
            <Link href={`/profile/${user.username}`}>
              <Avatar
                src={user.avatarUrl}
                alt={user.displayName}
                size="sm"
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
