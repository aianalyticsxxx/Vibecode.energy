import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vibe: {
          purple: '#8B5CF6',
          'purple-light': '#A78BFA',
          'purple-dark': '#7C3AED',
          blue: '#3B82F6',
          'blue-light': '#60A5FA',
          'blue-dark': '#2563EB',
          teal: '#14B8A6',
          'teal-light': '#2DD4BF',
          'teal-dark': '#0D9488',
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          'white-light': 'rgba(255, 255, 255, 0.15)',
          'white-lighter': 'rgba(255, 255, 255, 0.2)',
          dark: 'rgba(0, 0, 0, 0.1)',
          border: 'rgba(255, 255, 255, 0.2)',
        },
        neumorphic: {
          base: '#E0E5EC',
          light: '#FFFFFF',
          dark: '#A3B1C6',
          text: '#1a2a3a',
          'text-secondary': '#4a5568',
        },
      },
      backgroundImage: {
        'gradient-vibe': 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #14B8A6 100%)',
        'gradient-vibe-soft': 'linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, rgba(59, 130, 246, 0.5) 50%, rgba(20, 184, 166, 0.5) 100%)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '12px',
        'glass-heavy': '20px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.1)',
        'glass-lg': '0 12px 48px 0 rgba(31, 38, 135, 0.2)',
        glow: '0 0 20px rgba(139, 92, 246, 0.5)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.5)',
        'glow-teal': '0 0 20px rgba(20, 184, 166, 0.5)',
        'neu-sm': '4px 4px 8px #A3B1C6, -4px -4px 8px #FFFFFF',
        'neu': '8px 8px 16px #A3B1C6, -8px -8px 16px #FFFFFF',
        'neu-lg': '12px 12px 24px #A3B1C6, -12px -12px 24px #FFFFFF',
        'neu-inset-sm': 'inset 2px 2px 4px #A3B1C6, inset -2px -2px 4px #FFFFFF',
        'neu-inset': 'inset 4px 4px 8px #A3B1C6, inset -4px -4px 8px #FFFFFF',
        'neu-inset-lg': 'inset 6px 6px 12px #A3B1C6, inset -6px -6px 12px #FFFFFF',
      },
      animation: {
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'sparkle': 'sparkle 0.6s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'sparkle': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(139, 92, 246, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
