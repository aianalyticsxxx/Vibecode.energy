'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'glass' | 'neumorphic';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('glass');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('vibecode-theme') as Theme | null;
    if (stored && (stored === 'glass' || stored === 'neumorphic')) {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    document.documentElement.classList.remove('theme-glass', 'theme-neumorphic');
    document.documentElement.classList.add(`theme-${theme}`);
    localStorage.setItem('vibecode-theme', theme);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => setThemeState(newTheme);
  const toggleTheme = () => setThemeState(t => t === 'glass' ? 'neumorphic' : 'glass');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'glass' as Theme,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

export { ThemeContext };
