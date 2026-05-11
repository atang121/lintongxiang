# 童邻市集本机运维面板

这个工具只监听 `127.0.0.1`，用于在本机可视化执行固定的运维操作：

- 查看 PM2
- 构建前端 / 后端
- 启动或重启前端 PM2
- 启动或重启后端 PM2
- 保存 PM2 状态
- 备份 SQLite
- 验证首页 CSS 和 API 健康状态

## 启动

在 macOS 终端执行：

```bash
cd "/Users/jacktang/cursor/项目文件/襄阳二手物品（以物换物）-儿童/上线版_正式版（梧桐湾等3-5个小区）"
node tools/local-ops-dashboard/server.mjs
```

然后打开：

```text
http://127.0.0.1:4318
```

## 默认服务名

面板使用以下 PM2 服务名：

- 前端：`tonglin-h5`
- 后端：`tonglin-api`

如果本机已有旧服务名，可以先在面板里点“查看 PM2 列表”，再手动迁移为上面的名称，或用 PM2 删除旧服务后从面板重新启动。

## 数据库备份

面板的“备份 SQLite”按钮执行：

```bash
cd server
npm run backup:sqlite
```

备份文件写入：

```text
server/backups/sqlite/
```

如果以后迁移到云服务器，要在云服务器上的项目目录启动这个面板或执行同一条备份命令，备份的才是线上真实数据库。

## 常见提醒

- 后端 PM2 服务运行的是 `server/dist/index.js`。改了 `server/src/**` 后，先点“构建后端”或执行 `cd server && npm run build`，再重启后端。
- 如果只重启后端但没有构建，用户看到的仍可能是旧接口逻辑。
- 反馈飞书、协议更新、管理员删除原因通知这类问题，优先确认后端构建时间和进程启动时间是否晚于源码修改时间。
