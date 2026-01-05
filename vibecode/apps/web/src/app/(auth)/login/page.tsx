'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { GitHubLoginButton } from '@/components/auth/GitHubLoginButton';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render if already authenticated
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-bereal-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        {/* Logo */}
        <motion.div
          className="text-6xl mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          ⚡
        </motion.div>

        {/* Title */}
        <h1 className="text-4xl font-black text-white mb-2">
          VibeCode
        </h1>

        {/* Tagline */}
        <p className="text-bereal-white-muted mb-12">
          Your daily coding vibe.
        </p>

        {/* Login button */}
        <GitHubLoginButton />

        {/* Features */}
        <div className="mt-12 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-bereal-gray flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📸</span>
            </div>
            <div>
              <p className="font-semibold text-white">Daily VibeCheck</p>
              <p className="text-sm text-bereal-white-dim">Random time, one photo</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-bereal-gray flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🔥</span>
            </div>
            <div>
              <p className="font-semibold text-white">Build Streaks</p>
              <p className="text-sm text-bereal-white-dim">Don&apos;t break the chain</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-bereal-gray flex items-center justify-center flex-shrink-0">
              <span className="text-xl">👀</span>
            </div>
            <div>
              <p className="font-semibold text-white">See Real Vibes</p>
              <p className="text-sm text-bereal-white-dim">No filters, just code</p>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs mt-12 text-bereal-white-dim"
        >
          By continuing, you agree to our Terms of Service
        </motion.p>
      </motion.div>
    </div>
  );
}
