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
        // BeReal-style colors
        bereal: {
          black: '#000000',
          dark: '#0A0A0A',
          gray: '#1A1A1A',
          'gray-light': '#2A2A2A',
          'gray-lighter': '#3A3A3A',
          yellow: '#FFFF00',
          'yellow-dark': '#E6E600',
          white: '#FFFFFF',
          'white-muted': '#B0B0B0',
          'white-dim': '#808080',
        },
        // Keep old colors for compatibility during transition
        vibe: {
          purple: '#FFFF00', // Map to yellow
          'purple-light': '#FFFF66',
          'purple-dark': '#E6E600',
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.08)',
          'white-light': 'rgba(255, 255, 255, 0.12)',
          'white-lighter': 'rgba(255, 255, 255, 0.16)',
          dark: 'rgba(0, 0, 0, 0.5)',
          border: 'rgba(255, 255, 255, 0.1)',
        },
        neumorphic: {
          base: '#1A1A1A',
          light: '#2A2A2A',
          dark: '#0A0A0A',
          text: '#FFFFFF',
          'text-secondary': '#808080',
        },
      },
      backgroundImage: {
        'gradient-vibe': 'linear-gradient(135deg, #FFFF00 0%, #FFE600 100%)',
        'gradient-vibe-soft': 'linear-gradient(135deg, rgba(255, 255, 0, 0.3) 0%, rgba(255, 230, 0, 0.3) 100%)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '12px',
        'glass-heavy': '20px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.2)',
        'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.4)',
        glow: '0 0 20px rgba(255, 255, 0, 0.4)',
        'glow-yellow': '0 0 20px rgba(255, 255, 0, 0.5)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'sparkle': 'sparkle 0.6s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 255, 0, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(255, 255, 0, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
