'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface TerminalCardProps {
  title?: string;
  subtitle?: string;
  timestamp?: string;
  showTrafficLights?: boolean;
  variant?: 'default' | 'compact' | 'expanded';
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function TerminalCard({
  title,
  subtitle,
  timestamp,
  showTrafficLights = true,
  variant = 'default',
  className = '',
  headerClassName = '',
  bodyClassName = '',
  children,
  onClick,
}: TerminalCardProps) {
  const isCompact = variant === 'compact';

  return (
    <motion.div
      className={`
        terminal-window
        bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden
        shadow-terminal
        ${onClick ? 'cursor-pointer hover:border-terminal-border-bright transition-colors' : ''}
        ${className}
      `}
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Terminal Header */}
      <div
        className={`
          terminal-header
          bg-terminal-bg-elevated
          ${isCompact ? 'px-3 py-2' : 'px-4 py-2.5'}
          border-b border-terminal-border
          flex items-center justify-between
          ${headerClassName}
        `}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showTrafficLights && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-3 h-3 rounded-full bg-terminal-error/60" />
              <span className="w-3 h-3 rounded-full bg-terminal-warning/60" />
              <span className="w-3 h-3 rounded-full bg-terminal-success/60" />
            </div>
          )}

          <div className="flex items-center gap-2 min-w-0 flex-1 font-mono text-sm">
            {title && (
              <span className="text-terminal-text-secondary truncate">
                {title}
              </span>
            )}
            {subtitle && (
              <>
                <span className="text-terminal-text-dim">~</span>
                <span className="text-terminal-accent truncate">{subtitle}</span>
              </>
            )}
          </div>
        </div>

        {timestamp && (
          <span className="font-mono text-xs text-terminal-text-dim flex-shrink-0 ml-2">
            {timestamp}
          </span>
        )}
      </div>

      {/* Terminal Body */}
      <div className={`terminal-body ${isCompact ? 'p-3' : 'p-4'} ${bodyClassName}`}>
        {children}
      </div>
    </motion.div>
  );
}

// Terminal line components for building content
export function TerminalPrompt({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-2 font-mono text-sm ${className}`}>
      <span className="text-terminal-accent flex-shrink-0">$</span>
      <span className="text-terminal-text">{children}</span>
    </div>
  );
}

export function TerminalOutput({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-2 font-mono text-sm ${className}`}>
      <span className="text-terminal-text-dim flex-shrink-0">&gt;</span>
      <span className="text-terminal-text-secondary">{children}</span>
    </div>
  );
}

export function TerminalStatus({
  status,
  children,
  className = ''
}: {
  status: 'success' | 'error' | 'info' | 'pending';
  children: ReactNode;
  className?: string;
}) {
  const statusColors = {
    success: 'text-terminal-success',
    error: 'text-terminal-error',
    info: 'text-terminal-info',
    pending: 'text-terminal-text-dim',
  };

  const statusIcons = {
    success: '✓',
    error: '✗',
    info: '●',
    pending: '○',
  };

  return (
    <div className={`flex items-center gap-2 font-mono text-sm ${className}`}>
      <span className={statusColors[status]}>{statusIcons[status]}</span>
      <span className="text-terminal-text-secondary">{children}</span>
    </div>
  );
}

export function TerminalDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`border-t border-terminal-border my-3 ${className}`} />
  );
}
