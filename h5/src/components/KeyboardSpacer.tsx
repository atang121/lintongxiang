'use client';

/**
 * KeyboardSpacer — 全局键盘遮挡修复组件
 *
 * 原理：监听 visualViewport 变化，当键盘弹出时，
 * 通过 CSS var(--keyboard-height) 通知全局底部固定元素上移。
 *
 * 所有固定在底部的元素只需用 `bottom: calc(Xpx + var(--keyboard-height, 0px))`
 * 就能自动适配键盘高度。
 */

import { useEffect } from 'react';

export default function KeyboardSpacer() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const h = window.innerHeight;
      const vh = vv.height;
      const offset = vv.offsetTop || 0;
      const diff = h - vh - Math.abs(offset);
      const kh = diff > 80 ? diff : 0;
      document.documentElement.style.setProperty('--keyboard-height', `${kh}px`);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return null;
}
