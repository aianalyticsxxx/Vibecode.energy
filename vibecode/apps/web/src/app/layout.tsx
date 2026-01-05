import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { ThemedBackground } from '@/components/layout/ThemedBackground';
import './globals.css';

export const metadata: Metadata = {
  title: 'VibeCode Energy - Share Your Daily Vibe',
  description: 'A social network for vibecoders around the world. Share your daily vibe coding energy with the community.',
  keywords: ['vibecode', 'energy', 'social', 'photos', 'vibes', 'community', 'developers'],
  authors: [{ name: 'VibeCode Energy Team' }],
  openGraph: {
    title: 'VibeCode Energy - Share Your Daily Vibe',
    description: 'A social network for vibecoders around the world. Share your daily vibe coding energy with the community.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VibeCode Energy - Share Your Daily Vibe',
    description: 'A social network for vibecoders around the world. Share your daily vibe coding energy with the community.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#8B5CF6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen overflow-x-hidden bg-black text-white">
        <Providers>
          <ThemedBackground />
          <div className="relative z-10 min-h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
