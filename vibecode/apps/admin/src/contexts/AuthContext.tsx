'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { adminApi } from '@/lib/api';
import { getToken, clearAuth, type AdminUser } from '@/lib/auth';

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
    const token = getToken();
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
      setUser(data.user);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = () => {
    clearAuth();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.isAdmin ?? false,
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
