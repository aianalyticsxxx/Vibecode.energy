import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Admin panel dark theme
        admin: {
          bg: '#09090B',
          'bg-elevated': '#18181B',
          'bg-card': '#27272A',
          'bg-hover': '#3F3F46',
          border: 'rgba(255, 255, 255, 0.1)',
          'border-bright': 'rgba(255, 255, 255, 0.2)',
          text: '#FAFAFA',
          'text-secondary': '#A1A1AA',
          'text-dim': '#71717A',
          // Admin accent is blue instead of orange
          accent: '#3B82F6',
          'accent-hover': '#2563EB',
          'accent-soft': 'rgba(59, 130, 246, 0.2)',
          success: '#22C55E',
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
      },
      boxShadow: {
        'admin-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        admin: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
        'admin-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
