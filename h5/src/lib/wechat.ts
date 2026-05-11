/**
 * 微信 SDK 封装
 * 功能：
 * 1. 微信 JS-SDK（分享到朋友/朋友圈）需要在微信浏览器中使用
 * 2. 微信网页授权登录（静默授权获取 openid）
 *
 * 使用方式：
 *   import { wechat, wechatAuth } from '@/lib/wechat';
 *   await wechat.init(config);  // 页面加载时初始化
 *   wechat.share({ title, desc, link, imgUrl });  // 分享
 *   const openid = await wechatAuth.getOpenId();  // 登录
 */

import { isWeChatBrowser } from './env';

function getSafeStorage() {
  if (typeof localStorage === 'undefined') return null;
  if (
    typeof localStorage.getItem !== 'function' ||
    typeof localStorage.setItem !== 'function' ||
    typeof localStorage.removeItem !== 'function'
  ) {
    return null;
  }
  return localStorage;
}

// ===== 微信分享配置 =====

declare global {
  interface Window {
    wx?: {
      config: (cfg: WxConfig) => void;
      ready: (fn: () => void) => void;
      error: (fn: (err: unknown) => void) => void;
      shareAppMessage: (cfg: ShareCfg) => void;
      shareTimeline: (cfg: ShareCfg) => void;
      updateAppMessageShareData: (cfg: ShareCfg) => void;
      updateTimelineShareData: (cfg: ShareCfg) => void;
      chooseImage: (cfg: { count?: number; success?: (res: { localIds: string[] }) => void }) => void;
      previewImage: (cfg: { current: string; urls: string[] }) => void;
    };
  }
}

interface WxConfig {
  debug?: boolean;
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
  jsApiList: string[];
}

interface ShareCfg {
  title?: string;
  desc?: string;
  link?: string;
  imgUrl?: string;
  type?: string;
  dataUrl?: string;
}

export interface ShareParams {
  title: string;       // 分享标题
  desc: string;        // 分享描述
  link: string;        // 分享链接（必须是同域名）
  imgUrl: string;      // 分享图标 URL
}

/**
 * 微信分享 SDK
 * 仅在微信内置浏览器中生效，其他浏览器调用会被静默忽略
 */
export const wechat = {
  /**
   * 初始化微信 JS-SDK
   * 需要先从后端获取签名（signature），前端直接调用此方法完成配置
   * 后端签名接口：GET /api/wx/jsconfig?url=当前页面URL
   */
  async init(config: WxConfig): Promise<void> {
    if (!isWeChatBrowser || !window.wx) return;

    return new Promise((resolve, reject) => {
      window.wx!.config({
        ...config,
        debug: false,
        jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData', 'chooseImage', 'previewImage'],
      });

      window.wx!.ready(() => resolve());
      window.wx!.error((err) => reject(new Error(`微信SDK: ${JSON.stringify(err)}`)));
    });
  },

  /**
   * 配置分享信息（自定义）
   * 调用时机：在 wx.ready() 之后调用
   */
  share(params: ShareParams): void {
    if (!isWeChatBrowser || !window.wx) return;

    // 分享给朋友
    window.wx.updateAppMessageShareData({
      title: params.title,
      desc: params.desc,
      link: params.link,
      imgUrl: params.imgUrl,
    });

    // 分享到朋友圈
    window.wx.updateTimelineShareData({
      title: params.title,
      link: params.link,
      imgUrl: params.imgUrl,
    });
  },

  /**
   * 分享单张图片（高级用法）
   */
  shareImage(imgUrl: string): void {
    if (!isWeChatBrowser || !window.wx) return;
    window.wx.previewImage({ current: imgUrl, urls: [imgUrl] });
  },

  /**
   * 唤起微信分享面板（点击按钮触发）
   * 必须在用户交互事件中调用
   */
  showShareMenu(params: ShareParams): void {
    if (!isWeChatBrowser || !window.wx) {
      // 非微信浏览器：复制链接到剪贴板
      if (navigator.clipboard) {
        navigator.clipboard.writeText(params.link);
        alert('链接已复制到剪贴板，可粘贴分享');
      }
      return;
    }

    window.wx.ready(() => {
      window.wx!.updateAppMessageShareData(params);
      window.wx!.updateTimelineShareData(params);
    });
  },
};

// ===== 微信登录（网页授权） =====

export const wechatAuth = {
  /**
   * 获取微信授权 URL
   * scope=snsapi_base（静默授权）| snsapi_userinfo（需用户确认）
   */
  getAuthUrl(params: { redirectUri: string; scope?: 'snsapi_base' | 'snsapi_userinfo'; state?: string }): string {
    const appId = process.env.NEXT_PUBLIC_WX_APP_ID || '';
    const scope = params.scope || 'snsapi_base';
    const state = params.state || Math.random().toString(36).slice(2);
    const encoded = encodeURIComponent(params.redirectUri);

    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${encoded}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;
  },

  /**
   * 通过 code 获取 openid（需要后端配合）
   * 后端接口：GET /api/wx/openid?code=xxx
   * 后端用 code 换取 openid，原因是 AppSecret 不应暴露在前端
   */
  async getOpenId(code: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/wx/openid?code=${code}`);
      const json = await res.json();
      return json.openid || null;
    } catch {
      return null;
    }
  },

  /**
   * 引导用户授权（静默授权，自动跳转）
   * 授权完成后会回到当前页面，URL 中带 code 参数
   */
  login(redirectUri?: string): void {
    if (!isWeChatBrowser) {
      console.warn('wechatAuth.login 仅在微信浏览器中可用');
      return;
    }
    const appId = process.env.NEXT_PUBLIC_WX_APP_ID || '';
    if (!appId) {
      console.warn('请配置 NEXT_PUBLIC_WX_APP_ID');
      return;
    }
    const uri = redirectUri || window.location.href.split('?')[0];
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${encodeURIComponent(uri)}&response_type=code&scope=snsapi_base&state=1#wechat_redirect`;
    window.location.href = authUrl;
  },

  /**
   * 检测 URL 中是否有微信授权 code（自动处理回调）
   * 返回 code 或 null
   */
  parseCallbackCode(): string | null {
    if (!isWeChatBrowser) return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('code');
  },

  /**
   * 检测是否已登录（本地存储 openid）
   */
  isLoggedIn(): boolean {
    const storage = getSafeStorage();
    if (!storage) return false;
    return !!storage.getItem('wx_openid');
  },

  /**
   * 保存登录态
   */
  saveLogin(openid: string, userInfo?: Record<string, unknown>): void {
    const storage = getSafeStorage();
    if (!storage) return;
    storage.setItem('wx_openid', openid);
    if (userInfo) {
      storage.setItem('wx_userinfo', JSON.stringify(userInfo));
    }
  },

  /**
   * 清除登录态（退出登录）
   */
  logout(): void {
    const storage = getSafeStorage();
    if (!storage) return;
    storage.removeItem('wx_openid');
    storage.removeItem('wx_userinfo');
  },
};

// ===== 加载微信 JSSDK =====

/**
 * 动态加载微信 JSSDK（只需加载一次）
 * 在 layout.tsx 或 AppProvider 中调用
 */
export function loadWeChatSDK(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('wxjssdk')) return; // 已加载

  const script = document.createElement('script');
  script.id = 'wxjssdk';
  script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
  script.onerror = () => console.warn('微信JSSDK加载失败（非微信浏览器正常）');
  document.head.appendChild(script);
}
