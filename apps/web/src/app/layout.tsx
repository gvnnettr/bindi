import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/PWARegister';

export const metadata: Metadata = {
  title: 'Bindi — Okul Servisi Marketi',
  description:
    'Çocuğunuz için en uygun okul servisini tek bir formla bulun. Onaylı servisçilerden teklif alın, karşılaştırın, seçin.',
  manifest: '/manifest.json',
  applicationName: 'Bindi',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bindi',
  },
  icons: {
    icon: '/images/bindi-logo.jpg',
    apple: '/images/bindi-logo.jpg',
  },
};

export const viewport: Viewport = {
  themeColor: '#1A1A1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-white text-charcoal-900 antialiased">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
