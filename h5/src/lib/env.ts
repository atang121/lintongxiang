/**
 * 环境配置
 * 区分开发/生产环境，配置 API 地址和微信参数
 */

// 腾讯云后端 API 地址（用于生产环境）
const PRODUCTION_API_BASE = 'http://134.175.68.92:3001/api';

/**
 * 解析 API 根地址
 * - 生产环境（Vercel）：直接使用腾讯云后端
 * - 开发环境：使用 localhost
 */
export function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // 所有非本地环境都使用腾讯云后端
    if (origin.includes('vercel.app') || 
        origin.includes('tonglinhui.cn') ||
        origin !== 'http://localhost:3000') {
      return PRODUCTION_API_BASE;
    }
    
    // 本地开发
    return 'http://localhost:3001/api';
  }

  return 'http://localhost:3001/api';
}

// 微信 SDK AppID（需要替换为真实申请的 AppID）
export const WX_APP_ID = process.env.NEXT_PUBLIC_WX_APP_ID || '';

// 微信 SDK 签名验证用
export const WX_APP_SECRET = process.env.NEXT_PUBLIC_WX_APP_SECRET || '';

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
