import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { ToastProvider } from '@/components/ui/Toast';
import BottomNav from '@/components/BottomNav';
import TopBar from '@/components/TopBar';
import WeChatInit from '@/components/WeChatInit';
import KeyboardSpacer from '@/components/KeyboardSpacer';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xiangyangkidswap.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: '邻里童享 — 襄阳儿童闲置物品交换平台',
  description: '让每一件孩子不再需要的宝贝，走进另一个孩子的故事里',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: '邻里童享 — 襄阳儿童闲置物品交换平台',
    description: '让每一件孩子不再需要的宝贝，走进另一个孩子的故事里',
    images: ['/og-image.svg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '邻里童享 — 襄阳儿童闲置物品交换平台',
    description: '让每一件孩子不再需要的宝贝，走进另一个孩子的故事里',
    images: ['/og-image.svg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="text-[#1f2d26] antialiased">
        <AppProvider>
          <ToastProvider>
            <WeChatInit />
            <TopBar />
            <main>{children}</main>
            <KeyboardSpacer />
            <BottomNav />
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
