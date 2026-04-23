'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { isWeChatBrowser } from '@/lib/env';
import { wechat } from '@/lib/wechat';

export default function ShareHandler({
  itemId,
  path,
  title,
  desc,
  img,
}: {
  itemId: string;
  path: string;
  title: string;
  desc: string;
  img: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    async function initShare() {
      if (!isWeChatBrowser) {
        router.replace(path || '/');
        return;
      }

      const currentUrl = window.location.href.split('#')[0];
      const imgUrl = img.startsWith('http') ? img : `${window.location.origin}${img}`;
      const shareTarget = itemId ? `${window.location.origin}/items/${itemId}` : `${window.location.origin}${path || '/'}`;

      try {
        const res = await fetch(`/api/wx/jsconfig?url=${encodeURIComponent(currentUrl)}`);
        if (!res.ok) throw new Error('签名获取失败');
        const config = await res.json();

        await wechat.init({
          appId: config.appId,
          timestamp: config.timestamp,
          nonceStr: config.nonceStr,
          signature: config.signature,
          jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData'],
        });

        wechat.share({
          title: `${title} - 邻里童享`,
          desc,
          link: shareTarget,
          imgUrl,
        });

        setStatus('ok');
        setTimeout(() => router.replace(path || '/'), 500);
      } catch {
        setStatus('error');
        setTimeout(() => router.replace(path || '/'), 1000);
      }
    }

    void initShare();
  }, [desc, img, itemId, path, router, title]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#7ea6cf]">
      <p className="text-sm text-white/88">{status === 'loading' ? '正在准备分享内容...' : '正在跳转...'}</p>
    </div>
  );
}
