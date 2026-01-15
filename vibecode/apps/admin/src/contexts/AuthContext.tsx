'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { adminApi } from '@/lib/api';
import { getToken, setToken, clearAuth, type AdminUser } from '@/lib/auth';

// Only this username can access the admin panel
const ALLOWED_ADMIN_USERNAME = 'aianalyticsxxx';

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  logout: () => void;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    // Try to get token from admin storage first, then fall back to main app's token
    let token = getToken();

    // If no admin token, try to use the main app's token (shared localStorage)
    if (!token) {
      token = localStorage.getItem('access_token');
      if (token) {
        // Copy the main app's token to admin storage
        setToken(token);
      }
    }

    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const { data, error } = await adminApi.getMe();
    if (error || !data) {
      clearAuth();
      setUser(null);
    } else {
      // Only allow the specific admin username
      if (data.user.username === ALLOWED_ADMIN_USERNAME) {
        setUser(data.user);
      } else {
        clearAuth();
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = () => {
    clearAuth();
    setUser(null);
    // Redirect to main app
    window.location.href = 'https://oneshotcoding.io';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        // User is admin if they are the allowed username
        isAdmin: user?.username === ALLOWED_ADMIN_USERNAME,
        logout,
        refetch: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
