import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { ThemedBackground } from '@/components/layout/ThemedBackground';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OneShotCoding - Ship Your Daily Build',
  description: 'A social network for developers. Share your daily build with the community in one shot.',
  keywords: ['oneshotcoding', 'coding', 'social', 'builds', 'developers', 'community'],
  authors: [{ name: 'OneShotCoding Team' }],
  openGraph: {
    title: 'OneShotCoding - Ship Your Daily Build',
    description: 'A social network for developers. Share your daily build with the community in one shot.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OneShotCoding - Ship Your Daily Build',
    description: 'A social network for developers. Share your daily build with the community in one shot.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#D97706',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen overflow-x-hidden bg-terminal-bg text-terminal-text font-sans">
        <Providers>
          <ThemedBackground />
          <div className="relative z-10 min-h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
