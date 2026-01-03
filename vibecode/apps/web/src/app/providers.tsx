'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode, useCallback, useEffect } from 'react';
import { AuthContext, useAuthState } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type { User } from '@/lib/auth';
import {
  getToken,
  setToken,
  getUser,
  setUser,
  clearAuth,
  isAuthenticated,
} from '@/lib/auth';
import { api } from '@/lib/api';

interface ProvidersProps {
  children: ReactNode;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated()) {
      setUserState(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await api.getMe();

      if (error || !data) {
        clearAuth();
        setUserState(null);
      } else {
        setUser(data.user);
        setUserState(data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      clearAuth();
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (token: string) => {
    setToken(token);
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    clearAuth();
    setUserState(null);
  }, []);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await api.getMe();

      if (error || !data) {
        clearAuth();
        setUserState(null);
      } else {
        setUser(data.user);
        setUserState(data.user);
      }
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      clearAuth();
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for stored user first
    const storedUser = getUser();
    if (storedUser) {
      setUserState(storedUser);
    }

    // Then validate with server
    if (getToken()) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
