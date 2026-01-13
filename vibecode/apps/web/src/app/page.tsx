'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Go to feed
    router.replace('/feed');
  }, [authLoading, isAuthenticated, router]);

  // Loading state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        {/* Animated logo */}
        <motion.div
          className="text-6xl mb-6"
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          ✨
        </motion.div>

        {/* Loading text */}
        <h1 className="text-2xl font-bold gradient-text mb-4">OneShotCoding</h1>

        {/* Loading spinner */}
        <div className="flex justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-vibe-purple border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>

        {/* Status text */}
        <motion.p
          className="mt-4 text-white/50 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {authLoading
            ? 'Loading...'
            : !isAuthenticated
            ? 'Redirecting to login...'
            : 'Opening your feed...'}
        </motion.p>
      </motion.div>
    </div>
  );
}
