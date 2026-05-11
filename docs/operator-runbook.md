# 童邻市集运维手册

更新日期：2026-05-05

## 本机启动

前端：

```bash
cd h5
npm run dev
```

后端：

```bash
cd server
npm run dev
```

生产构建：

```bash
cd h5
npm run build
```

```bash
cd server
npm run build
```

如果后端运行方式是 `node dist/index.js` 或 PM2 服务 `tonglin-api`，修改 `server/src/**` 后必须先执行 `npm run build`，再重启后端。只重启旧 `dist` 不会带上源码改动。

## 本机运维面板

启动：

```bash
node tools/local-ops-dashboard/server.mjs
```

打开 `http://127.0.0.1:4318`。

默认 PM2 服务名：

- 前端：`tonglin-h5`
- 后端：`tonglin-api`

面板可以执行 PM2 列表、前后端构建、启动/重启、保存 PM2 状态、SQLite 备份和健康检查。

## SQLite 备份

当前核心业务数据在 `server/data/swap.db`。执行：

```bash
cd server
npm run backup:sqlite
```

备份写入 `server/backups/sqlite/`。如果应用已经部署到云服务器，必须在云服务器项目目录执行，备份才是线上数据库。

上线当天建议先手动备份一次，再配置每日定时任务。迁移到云数据库前，不要删除 `server/backups/sqlite/` 的有效备份。

## 协议与合规文件维护

前端展示的用户服务文件集中维护在 `h5/public/legal/service-agreement.json`：

- `documents`：当前只保留 `user-service-agreement` 一份完整《用户服务协议》，正文内可整合平台定位、发布规则、物品提供承诺和交易安全须知。
- `order`：登录/注册页和协议总览页的展示顺序，目前只展示《用户服务协议》。
- `version`：前端显示的协议版本。

后端用于判断是否需要用户重新确认的版本在 `server/src/config/serviceAgreement.json`。如果只是修改错别字或表达，可以只改前端 JSON；如果规则有实质变化，需要同时更新前后端两个 `version`，这样老用户下次登录或使用受保护功能时会重新确认。

现在更推荐用管理员后台的“协议管理”工具维护：可上传 `.docx` / `.txt` / `.md`，也可直接粘贴正文，填写版本号后发布。发布新版本后，未确认该版本的用户会在后续登录、发布、私信、预约或响应需求前补确认。

手动修改 JSON 时只改这几处：

1. `version`：例如 `"2026-05-04"`。必须保留英文双引号。
2. `summary`：协议列表里的简短说明。
3. `paragraphs`：每一段正文是一行字符串，段落之间用英文逗号分隔；最后一段后面不要加逗号。

不要改 `order` 和 `user-service-agreement` 这两个键名，除非代码也同步调整。修改后如果页面打不开，优先检查是否用了中文引号、漏了英文逗号，或最后一段多写了逗号。

改完后执行：

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

## 冒烟检查

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

当前沙箱环境运行后端 `tsx` 可能遇到 IPC pipe 权限限制；运行态验证优先在本机终端或 PM2 面板执行。

## 反馈通道排查

反馈提交成功后，前端/接口响应会带：

- `providers`
- `failed_providers`
- `delivery_attempts`

排查顺序：

1. `FEISHU_WEBHOOK_URL` 是否配置，群机器人是否能收到。
2. `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_BASE_TOKEN`、`FEISHU_FEEDBACK_TABLE_ID` 是否配置，表格字段是否匹配。
3. SMTP 是否配置，`SMTP_PASS` 必须是邮箱授权码。
4. 查看后端日志 `[Feedback] delivery summary`。

管理员回复登录用户的反馈后，用户查看位置是“消息 → 通知”。未登录反馈没有站内用户 id，只能根据用户留下的联系方式线下处理。

## 管理员删除物品排查

管理员删除违规物品时应满足三点：

1. `items.status = 'deleted'`
2. `items.delete_reason/deleted_by/deleted_at` 有值
3. 发布者收到一条 `type='handling'` 的站内通知

如果用户没有收到删除原因，先查数据库：

```bash
sqlite3 server/data/swap.db "select id,title,user_id,status,delete_reason,deleted_by,deleted_at from items where id='物品ID';"
sqlite3 server/data/swap.db "select id,user_id,type,title,content,related_item_id,created_at from notifications where related_item_id='物品ID';"
```

如果 `delete_reason` 为空，通常说明删除发生时后端还在跑旧构建。执行：

```bash
cd server
npm run build
```

然后通过 PM2 面板或命令重启后端。

历史旧构建删除造成的具体原因无法从数据库恢复；只能由管理员补发一条通用处理通知。

## 常见问题

### 手机访问不到

- 确认手机和电脑在同一 Wi-Fi。
- 使用电脑局域网 IP 访问前端，例如 `http://192.168.x.x:3000`。
- API 会根据前端 origin 推断 `3001`，生产环境应显式配置 `NEXT_PUBLIC_API_BASE_URL`。

### 私信和通知重复

2026-05-01 起后端不再为私信生成 notification。历史数据库中旧的 `type='message'` 通知前端会过滤，私信只在消息页“私信”里处理。

### 协议更新弹窗同意后不关闭

2026-05-05 已修复前端归一化逻辑：`normalizeUser` 优先信任后端 `service_agreement_required`。如果仍复现，先确认前端已重新 `npm run build` 并重启 `tonglin-h5`。

### 物品详情看不到预约按钮

详情页会隐藏全局底部导航，由详情页自己的底部动作栏承接“联系并预约/取消预约/提醒确认/确认交接”。如果仍看不到，先刷新 H5 并确认前端服务已重启。

### 添加到桌面没弹系统安装框

不是所有浏览器都开放 `beforeinstallprompt`。首页会给步骤提示：安卓浏览器可直接安装；iPhone 用分享菜单“添加到主屏幕”；微信内先用右上角菜单或外部浏览器。
