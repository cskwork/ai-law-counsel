import type { Metadata, Viewport } from 'next';
import { Noto_Serif_KR, Noto_Sans_KR, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const notoSerifKr = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-noto-serif-kr',
  display: 'swap',
});

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '법률 상담 AI',
  description: '국가법령정보센터 기반 AI 법률 상담 서비스',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${notoSerifKr.variable} ${notoSansKr.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-[100dvh] bg-surface-ground text-ink-primary font-body antialiased">
        {children}
      </body>
    </html>
  );
}
