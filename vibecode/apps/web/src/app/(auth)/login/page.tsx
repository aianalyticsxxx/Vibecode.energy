'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GitHubLoginButton } from '@/components/auth/GitHubLoginButton';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render if already authenticated
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Theme Toggle in corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <GlassPanel className="text-center" padding="lg">
          {/* Logo */}
          <motion.div
            className="text-6xl mb-4"
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            ✨
          </motion.div>

          {/* Title */}
          <h1 className={cn(
            "text-3xl font-bold mb-2",
            isNeumorphic ? "text-neumorphic-text" : "gradient-text"
          )}>VibeCode Energy</h1>

          {/* Tagline */}
          <p className={cn("mb-8", isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/60")}>
            Connect with vibecoders around the world
          </p>

          {/* Login button */}
          <GitHubLoginButton />

          {/* Features */}
          <div className="mt-8 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 text-left"
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                isNeumorphic ? "shadow-neu-sm bg-neumorphic-base" : "bg-vibe-purple/20"
              )}>
                <span className="text-lg">📸</span>
              </div>
              <div>
                <p className={cn("font-medium", isNeumorphic ? "text-neumorphic-text" : "text-white/90")}>Daily photo</p>
                <p className={cn("text-sm", isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/50")}>Share one vibe per day</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 text-left"
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                isNeumorphic ? "shadow-neu-sm bg-neumorphic-base" : "bg-vibe-blue/20"
              )}>
                <span className="text-lg">✨</span>
              </div>
              <div>
                <p className={cn("font-medium", isNeumorphic ? "text-neumorphic-text" : "text-white/90")}>Sparkle reactions</p>
                <p className={cn("text-sm", isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/50")}>Spread good vibes</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-3 text-left"
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                isNeumorphic ? "shadow-neu-sm bg-neumorphic-base" : "bg-vibe-teal/20"
              )}>
                <span className="text-lg">🌊</span>
              </div>
              <div>
                <p className={cn("font-medium", isNeumorphic ? "text-neumorphic-text" : "text-white/90")}>Zen community</p>
                <p className={cn("text-sm", isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/50")}>Positive vibes only</p>
              </div>
            </motion.div>
          </div>
        </GlassPanel>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className={cn("text-center text-xs mt-6", isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/30")}
        >
          By continuing, you agree to our Terms of Service
        </motion.p>
      </motion.div>
    </div>
  );
}
