'use client';

import { useEffect, useState } from 'react';
import { Download, Home, MoreHorizontal, Smartphone, X } from 'lucide-react';

import { isWeChatBrowser } from '@/lib/env';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'tonglin-install-prompt-dismissed';

function getStorage() {
  if (typeof window === 'undefined') return null;
  const storage = window.localStorage;
  if (
    typeof storage?.getItem !== 'function' ||
    typeof storage?.setItem !== 'function'
  ) {
    return null;
  }
  return storage;
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const storage = getStorage();
    if (storage?.getItem(DISMISS_KEY) === '1') return;

    const showTimer = window.setTimeout(() => setVisible(true), 1200);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    getStorage()?.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) {
      setShowGuide(true);
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') dismiss();
    setDeferredPrompt(null);
  };

  return (
    <section className="mt-4 overflow-hidden rounded-[26px] border border-[#d9e6dd] bg-[linear-gradient(135deg,#f7fbf4,#fff7e8)] px-4 py-3 shadow-[0_16px_36px_rgba(149,132,109,0.08)]">
      <div className="flex items-start gap-3">
        <img
          src="/app-icon.png"
          alt="童邻市集图标"
          className="h-14 w-14 shrink-0 rounded-[18px] object-cover shadow-[0_10px_24px_rgba(95,128,111,0.22)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#274335]">添加到桌面，下次一键进市集</p>
              <p className="mt-1 text-xs leading-5 text-[#6f7f76]">
                像小程序一样从手机桌面打开，适合家长随手发布和查看预约。
              </p>
            </div>
            <button
              onClick={dismiss}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9a9288] active:bg-white/70"
              aria-label="关闭添加到桌面提示"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void install()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1f3a30] px-4 py-2.5 text-xs font-bold text-white active:bg-[#173026]"
            >
              <Download size={14} /> 添加到桌面
            </button>
            <button
              onClick={() => setShowGuide((value) => !value)}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-[#d8cbb7] bg-white/75 px-3 py-2.5 text-xs font-semibold text-[#657369]"
            >
              <MoreHorizontal size={14} /> 步骤
            </button>
          </div>

          {showGuide && (
            <div className="mt-3 grid gap-2 text-xs leading-5 text-[#657369]">
              <div className="flex gap-2 rounded-2xl bg-white/72 px-3 py-2">
                <Smartphone size={15} className="mt-0.5 shrink-0 text-[#5f806f]" />
                <span>{isWeChatBrowser ? '微信内先点右上角，选择在浏览器打开；再用浏览器菜单添加到桌面。' : '安卓浏览器会优先唤起系统安装提示，确认后桌面会出现童邻市集图标。'}</span>
              </div>
              <div className="flex gap-2 rounded-2xl bg-white/72 px-3 py-2">
                <Home size={15} className="mt-0.5 shrink-0 text-[#5f806f]" />
                <span>iPhone 可点浏览器分享按钮，选择“添加到主屏幕”。</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
