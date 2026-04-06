import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
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
    <html lang="ko" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-[100dvh] bg-zinc-50 text-zinc-950 font-[family-name:var(--font-geist)] antialiased">
        {children}
      </body>
    </html>
  );
}
