import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 关闭开发指示器（Next.js 左下角的 N 图标）
  devIndicators: false,
  // 开发模式下 Next 会校验访问 /_next/*、HMR WebSocket 等请求的 Origin。
  // 若只写死某一个局域网 IP（如 192.168.1.210），用手机访问其它网段（如 192.168.3.x）时
  // chunk 会 403，页面能打开但 React 无法水合 → 按钮点击完全无反应。
  // 通配符规则与 next/dist/server/app-render/csrf-protection 一致（按「.」分段匹配）。
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  // 把 Turbopack 的项目根锁定在 h5 目录内，避免把 .worktrees 等副本放大到监听范围。
  turbopack: {
    root: __dirname,
  },

  // 图片域名配置（允许加载外部图片）
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "res.wx.qq.com" },
      // 腾讯云 COS（生产环境图片存储）
      { protocol: "https", hostname: "**.myqcloud.com" },
      { protocol: "https", hostname: "**.tencentcos.cn" },
    ],
  },

  // 生产环境开启压缩和优化
  compress: true,

  // 生成静态导出（可选，适合部署到静态托管）
  // 如果后端是 API 接口，不建议开启 output: 'export'
  // output: 'export',

  // HTTP 请求头安全配置
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
