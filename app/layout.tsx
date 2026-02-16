import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'VECTERAI | AI-Powered Restaurant Operations',
  description:
    'Transform your restaurant with intelligent phone agents, smart reservations, and seamless order management. Let AI handle the calls while you focus on the food.',
  keywords: [
    'restaurant AI',
    'phone agent',
    'voice AI',
    'restaurant automation',
    'reservations',
    'order management',
  ],
  authors: [{ name: 'VECTERAI' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'VECTERAI',
    title: 'VECTERAI | AI-Powered Restaurant Operations',
    description:
      'Transform your restaurant with intelligent phone agents, smart reservations, and seamless order management.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VECTERAI | AI-Powered Restaurant Operations',
    description:
      'Transform your restaurant with intelligent phone agents, smart reservations, and seamless order management.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A0F1C',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-deep-navy font-sans">{children}</body>
    </html>
  );
}
