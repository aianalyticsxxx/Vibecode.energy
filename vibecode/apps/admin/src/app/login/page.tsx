'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      router.push('/');
    } else if (!isLoading && user && !isAdmin) {
      router.push('/access-denied');
    }
  }, [user, isLoading, isAdmin, router]);

  const handleLogin = () => {
    // Redirect to main app's GitHub OAuth
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    // Detect basePath from current URL (if we're at /crm/login, basePath is /crm)
    const pathname = window.location.pathname;
    const basePath = pathname.startsWith('/crm') ? '/crm' : '';
    const redirectUrl = `${window.location.origin}${basePath}`;
    window.location.href = `${apiUrl}/auth/github?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-admin-bg">
        <div className="w-8 h-8 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-admin-bg p-4">
      <div className="w-full max-w-md">
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-admin-accent flex items-center justify-center">
              <span className="text-white font-bold text-2xl">OS</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-admin-text text-center mb-2">
            Admin Panel
          </h1>
          <p className="text-admin-text-secondary text-center mb-8">
            Sign in with your administrator account
          </p>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-admin-bg-card border border-admin-border rounded-lg text-admin-text font-medium hover:bg-admin-bg-hover transition-colors"
          >
            <GitHubIcon className="w-5 h-5" />
            Continue with GitHub
          </button>

          {/* Info */}
          <p className="text-xs text-admin-text-dim text-center mt-6">
            Only users with admin privileges can access this panel.
          </p>
        </div>
      </div>
    </div>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
