'use client';

/**
 * 微信 SDK 初始化组件
 * 在应用启动时自动加载微信 JSSDK（非微信浏览器静默跳过）
 */
import { useEffect } from 'react';
import { loadWeChatSDK } from '@/lib/wechat';

export default function WeChatInit() {
  useEffect(() => {
    loadWeChatSDK();
  }, []);

  return null;
}
