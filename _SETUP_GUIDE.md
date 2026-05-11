# 童邻市集 — 接入与部署指南

更新日期：2026-05-05

本项目已经具备小范围试运营所需的 H5、API、SQLite 数据、飞书反馈、邮件兜底、用户服务协议、PWA 添加到桌面和本机运维面板。首批试点为襄阳东门口周边 5 个相邻小区，暂不启用距离计算。

## 1. 本地运行

前端：

```bash
cd h5
npm install
npm run dev
```

后端：

```bash
cd server
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`。手机访问时使用电脑局域网 IP，例如 `http://192.168.x.x:3000`。

## 2. 环境变量

### 前端 `h5/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_WX_APP_ID=
NEXT_PUBLIC_TENCENT_MAP_KEY=
```

生产环境把 `NEXT_PUBLIC_API_BASE_URL` 和 `NEXT_PUBLIC_BASE_URL` 改为 HTTPS 域名。

### 后端 `server/.env`

从 `server/.env.example` 复制：

```bash
cd server
cp .env.example .env
```

上线必须确认：

- `JWT_SECRET`：32 字符以上强随机字符串。
- `NODE_ENV=production`。
- `FRONTEND_URL`：H5 正式域名。
- `SERVER_PUBLIC_URL`：API 正式域名。
- `SMTP_*`：反馈兜底邮件。
- `FEISHU_*`：飞书机器人和多维表格反馈存档。
- `SMS_ENABLED=true` 时必须实测腾讯云短信配置；生产环境短信未完整配置会拒绝 preview。

不要提交真实 `.env`。

## 3. 微信分享与添加到桌面

微信分享需要公众号 JS 安全域名和后端签名：

```env
WECHAT_APP_ID=wx...
WECHAT_APP_SECRET=...
SERVER_PUBLIC_URL=https://api.example.com
NEXT_PUBLIC_WX_APP_ID=wx...
```

添加到桌面使用标准 PWA：

- `h5/src/app/manifest.ts` 生成 `manifest.webmanifest`
- `/app-icon.svg` 是桌面图标
- `InstallAppPrompt` 在首页提示用户添加

安卓浏览器支持时会弹系统安装提示；iPhone 通过浏览器分享菜单“添加到主屏幕”；微信内需先用右上角菜单或外部浏览器完成。

## 4. 飞书反馈

反馈提交会尝试三路投递：

1. 飞书群机器人：`FEISHU_WEBHOOK_URL`
2. 飞书多维表格：`FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_BASE_TOKEN`、`FEISHU_FEEDBACK_TABLE_ID`
3. 邮件兜底：`SMTP_*` / `FEEDBACK_RECEIVER`

接口返回会带 `providers`、`failed_providers`、`delivery_attempts`。后端日志会打印 `[Feedback] delivery summary`，用于判断失败点。

## 5. 图片存储

默认本地存储在 `server/data/uploads/`。如果接腾讯云 COS，配置：

```env
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=ap-guangzhou
```

上传已限制图片 MIME、扩展名、大小和 category，避免写入危险文件。

## 6. 生产部署建议

### 前端

- 可部署到 Cloudflare Pages、Vercel 或云服务器。
- 必须配置 `NEXT_PUBLIC_API_BASE_URL` 和 `NEXT_PUBLIC_BASE_URL`。

### 后端

云服务器 Node.js 18+：

```bash
cd server
npm install
npm run build
pm2 start dist/index.js --name tonglin-api
pm2 save
```

后续只要改了 `server/src/**`，上线前都要重新执行 `npm run build` 并重启 `tonglin-api`。否则运行的 `dist/index.js` 仍是旧代码。

前端如果同机 PM2 运行：

```bash
cd h5
npm install
npm run build
pm2 start npm --name tonglin-h5 -- start
pm2 save
```

建议用 Nginx/Caddy 做 HTTPS 反向代理。微信分享必须 HTTPS。

## 7. 本机运维面板

```bash
node tools/local-ops-dashboard/server.mjs
```

打开 `http://127.0.0.1:4318`，可查看 PM2、构建、启动/重启服务、保存 PM2 状态、备份 SQLite 和执行健康检查。

默认服务名：

- `tonglin-h5`
- `tonglin-api`

## 8. 数据备份

当前核心数据仍是 SQLite，适合 5 个小区冷启动，但必须备份。

手动备份：

```bash
cd server
npm run backup:sqlite
```

备份路径：`server/backups/sqlite/`。

上线当天先手动备份一次；云服务器上线后，定时任务必须在云服务器项目目录执行。

## 9. 验证清单

```bash
cd h5
node --test test/*.mjs
npm exec tsc -- --noEmit
npm run build
```

```bash
cd server
npm run build
```

确认：

- 首页能打开，试点小区物品可浏览。
- 手机验证码可登录；生产环境不会返回 preview 验证码。
- 发布闲置必须上传图片；发布需求可无图。
- 物品详情能联系并预约，预约者可取消，发布者可确认交接。
- 候补预约能顺延；私信页可对关联物品直接预约或加入候补。
- 消息页可回复私信；通知页不重复显示私信。
- 反馈提交后飞书机器人、飞书多维表格或邮件至少一路成功。
- 管理员回复反馈后，登录用户能在“消息 → 通知”看到处理回复。
- 管理员删除违规物品时必须填写原因，发布者能收到删除原因通知。
- 协议更新后，老用户能在登录、发布、私信或预约前补确认，不需要强制退出登录。
- “添加到桌面”提示和图标能显示。
