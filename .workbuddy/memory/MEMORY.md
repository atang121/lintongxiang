# 童邻市集 H5 项目记忆

更新日期：2026-05-01

## 项目结构

- 前端：`h5/`，Next.js 16 + React 19，端口 `3000`。
- 后端：`server/`，Express + TypeScript，端口 `3001`。
- 数据库：`server/data/swap.db`，sql.js SQLite。
- 本机运维面板：`tools/local-ops-dashboard/`，默认 `http://127.0.0.1:4318`。
- PM2 服务名：前端 `tonglin-h5`，后端 `tonglin-api`。

## 当前验证命令

- `cd h5 && node --test test/*.mjs`
- `cd h5 && npm exec tsc -- --noEmit`
- `cd h5 && npm run build`
- `cd server && npm run build`
- `cd server && npm run backup:sqlite`

后端 `tsx` 运行态测试在部分沙箱会遇到 IPC pipe 权限问题；编译可在沙箱验证，运行态优先用本机终端或 PM2 面板。

## 产品规则

- 品牌名：`童邻市集`。旧名 `邻里童享` 不再使用。
- 试点范围：襄阳东门口周边 5 个相邻小区，首期不做距离计算和定位排序。
- 登录注册：手机号验证码；首次注册昵称必填，孩子年龄段和孩子数量选填。
- 发布闲置：必须至少 1 张图片。
- 发布需求：可无图，无图用 `WantedCover` 展示。
- 详情图：`ItemImageCarousel` 支持多图滑动、缩略图、横竖图统一展示。
- 邻里等级：按完成交换次数显示 `新邻居`、`有过交换`、`靠谱邻居`、`热心邻居`，不展示小数信用评分。
- 预约：发布者确认交接；预约者可取消、联系、提醒确认；双方之一可标记未能成交。
- 私信：消息页可打开会话并回复；打开会话会标记来信已读。
- 通知：只显示预约/系统/管理员广播；私信不再重复生成或展示通知。
- PWA：首页有添加到桌面提示，manifest 路由为 `/manifest.webmanifest`，图标为 `/app-icon.svg`。

## 集成

- 飞书机器人：`FEISHU_WEBHOOK_URL`。
- 飞书多维表格：反馈存档使用 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_BASE_TOKEN`、`FEISHU_FEEDBACK_TABLE_ID`。
- 反馈接口返回 `providers`、`failed_providers`、`delivery_attempts` 诊断字段。
- 邮件：SMTP 作为反馈兜底，`SMTP_PASS` 是邮箱授权码。
- 图片：未配置 COS 时使用本地 `server/data/uploads/`；上传已限制图片类型、扩展名和 category。
- 短信：开发环境可 preview；生产环境短信未完整配置时拒绝返回 preview 验证码。

## 数据与运维

- SQLite 适合 5 个小区冷启动，但必须备份。
- 备份脚本：`server/scripts/backup-sqlite.sh`，命令：`cd server && npm run backup:sqlite`。
- 备份路径：`server/backups/sqlite/`。
- 云服务器上线后，定时备份必须在云服务器项目目录执行。

## 文档入口

- `AGENTS.md`：给 Codex/WorkBuddy 的项目级约定。
- `README-上线版.md`：交付包说明。
- `_SETUP_GUIDE.md`：部署与接入。
- `docs/architecture.md`：架构、数据模型、状态机。
- `docs/integration-guide.md`：API、环境变量、PWA。
- `docs/operator-runbook.md`：运维、备份、排查。
- `docs/handoff-2026-05-01.md`：2026-05-01 收尾交接。

