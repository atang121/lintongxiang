/**
 * 环境配置
 * 区分开发/生产环境，配置 API 地址和微信参数
 */

/**
 * 解析 API 根地址（每次调用，避免模块在 SSR 阶段先执行时把地址锁死成 localhost）。
 * 生产环境强制使用同源策略（通过 catch-all API 路由代理到后端）。
 */
export function resolveApiBaseUrl(): string {
  // 生产环境：强制使用同源策略，忽略 NEXT_PUBLIC_API_BASE_URL
  // 这样 /api/* 请求会被 catch-all 路由捕获并代理到后端
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return `${origin}/api`;
  }

  // 开发环境：可以使用环境变量或默认值
  if (process.env.NODE_ENV !== 'production') {
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      return process.env.NEXT_PUBLIC_API_BASE_URL;
    }
  }

  // 服务端渲染或开发环境默认值
  return 'http://localhost:3001/api';
}

// 微信 SDK AppID（需要替换为真实申请的 AppID）
export const WX_APP_ID = process.env.NEXT_PUBLIC_WX_APP_ID || '';

// 微信 SDK 签名验证用
export const WX_APP_SECRET = process.env.WX_APP_SECRET || '';

// 地图服务
export const TENCENT_MAP_KEY = process.env.NEXT_PUBLIC_TENCENT_MAP_KEY || '';

// 极光推送 AppKey（可选，用于消息推送）
export const JIGUANG_APP_KEY = process.env.NEXT_PUBLIC_JIGUANG_APP_KEY || '';

// 是否为微信内置浏览器
export const isWeChatBrowser = typeof window !== 'undefined' &&
  /MicroMessenger/i.test(navigator.userAgent);

// 是否为移动端
export const isMobile = typeof window !== 'undefined' &&
  /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
