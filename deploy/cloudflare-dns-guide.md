# Cloudflare DNS 配置指南

## 前置准备

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的域名 `tonglinhui.cn`

## DNS 记录配置

### 需要设置的记录

| 类型 | 名称 | 内容 (IP) | 代理状态 | 说明 |
|------|------|----------|----------|------|
| A | www | 你的腾讯云服务器公网 IP | ✅ 已代理 | 主站访问 |
| A | @ | 你的腾讯云服务器公网 IP | ✅ 已代理 | 根域名 |
| A | api | 你的腾讯云服务器公网 IP | ✅ 已代理 | API 专用（可选） |

### 操作步骤

1. **获取服务器公网 IP**
   ```
   登录腾讯云控制台 → 云服务器 CVM → 实例 → 公网 IP
   ```

2. **添加 DNS 记录**
   - 进入 Cloudflare DNS 设置页面
   - 点击 "Add record"
   - 填写：
     - Type: `A`
     - Name: `www`
     - IPv4 address: `你的服务器公网IP`
     - Proxy status: `Proxied` (橙色云朵)
     - TTL: `Auto`

3. **同样添加根域名记录**
   - Type: `A`
   - Name: `@`
   - IPv4 address: `你的服务器公网IP`
   - Proxy status: `Proxied`

## SSL/TLS 设置

### 推荐配置

1. 进入 **SSL/TLS** → **Overview**
2. 选择 **Full** 或 **Full (strict)**

### 边缘证书

- 确保 **Always Use HTTPS** 已开启
- 启用 **Automatic HTTPS Rewrites**

## 页面规则（可选）

如果有特殊需求，可以设置页面规则：

1. 进入 **Rules** → **Page Rules**
2. 添加规则：
   - URL pattern: `tonglinhui.cn/*`
   - 设置: Force HTTPS, Cache Level, etc.

## 验证配置

部署完成后，访问以下地址验证：

1. https://www.tonglinhui.cn - 应该显示 H5 首页
2. https://www.tonglinhui.cn/api/health - 应该返回 API 健康状态

## 常见问题

### DNS 生效时间
- 新记录：通常 1-30 分钟
- 修改记录：最长 5 分钟

### 验证 DNS 传播
- 使用 https://www.whatsmydns.net/
- 或在终端运行: `nslookup www.tonglinhui.cn`

### SSL 证书问题
- Cloudflare 会自动处理 SSL 证书
- 如果有问题，进入 **SSL/TLS** → **Edge Certificates**
- 点击 **Issue Certificate** 重新申请
