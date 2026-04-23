/**
 * useKeyboardHeight
 * 通过 visualViewport API 检测虚拟键盘开启高度，
 * 返回 keyboardHeight（键盘高度）和 isKeyboardOpen。
 *
 * 用法：
 *   const { keyboardHeight } = useKeyboardHeight();
 *   style={{ paddingBottom: `${keyboardHeight}px` }}
 */
'use client';

import { useEffect, useState } from 'react';

export function useKeyboardHeight(): { keyboardHeight: number; isKeyboardOpen: boolean } {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      const h = window.innerHeight;
      const vh = viewport.height;
      const offset = viewport.offsetTop || 0;
      // 当视口高度显著小于窗口高度时，认为键盘打开了
      const diff = h - vh - Math.abs(offset);
      if (diff > 100) {
        setKeyboardHeight(diff);
        setIsKeyboardOpen(true);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
      }
    };

    handleResize(); // 初始化
    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen };
}
