import type { Metadata, Viewport } from 'next';
import { Gothic_A1, Noto_Sans_KR, DotGothic16 } from 'next/font/google';
import './globals.css';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

// 창구 사인 서체 (헤드라인)
const gothicA1 = Gothic_A1({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-gothic-a1',
  display: 'swap',
});

// 본문 서체 (장문 법률 텍스트)
const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

// LED 전광판 숫자/라틴
const dotGothic = DotGothic16({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dotgothic',
  display: 'swap',
});

const SITE_URL = 'https://ai-law-counsel.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: '법률 상담 AI',
  description: '국가법령정보센터 기반 AI 법률 상담 서비스',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: '법률 상담 AI',
    description: '국가법령정보센터 기반 AI 법률 상담 서비스',
    url: SITE_URL,
    siteName: '법률 상담 AI',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: '법률 상담 AI: 민원 창구 앞 번호표와 법령, 판례, 행정규칙을 뜻하는 세 가지 색 안내선',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '법률 상담 AI',
    description: '국가법령정보센터 기반 AI 법률 상담 서비스',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0E3B34' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1412' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${gothicA1.variable} ${notoSansKr.variable} ${dotGothic.variable}`}
    >
      <head>
        {/* 첫 페인트 전에 저장된/시스템 테마 적용 (깜빡임 방지) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-[100dvh] bg-ground text-ink font-body antialiased">
        {children}
      </body>
    </html>
  );
}
