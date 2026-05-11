# 童邻市集集成指南

更新日期：2026-05-06

## 本地地址

- 前端：`http://localhost:3000`
- API：`http://localhost:3001/api`
- 手机真机：使用电脑局域网 IP，例如 `http://192.168.x.x:3000`

## 环境变量

### 前端 `h5/.env.local`

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | API 地址，本地为 `http://localhost:3001/api` |
| `NEXT_PUBLIC_BASE_URL` | H5 公网地址，用于 meta / 分享 |
| `NEXT_PUBLIC_WX_APP_ID` | 微信 JS-SDK AppID |
| `NEXT_PUBLIC_TENCENT_MAP_KEY` | 腾讯地图 Key，首期可不启用距离定位 |

### 后端 `server/.env`

| 变量 | 说明 |
|---|---|
| `JWT_SECRET` | 生产必须是 32 字符以上强随机字符串 |
| `FRONTEND_URL` | 前端地址，用于 CORS |
| `SERVER_PUBLIC_URL` | API 公网地址，用于图片 URL 和微信签名 |
| `SMS_ENABLED` | `true` 时启用真实短信；生产未配完整会拒绝 preview |
| `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY` | 腾讯云 API 密钥，用于调用短信 OpenAPI |
| `TENCENT_SMS_SDK_APP_ID` / `TENCENT_SMS_SIGN` / `TENCENT_SMS_TEMPLATE_ID` | 腾讯云短信应用、签名和模板配置 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | 邮件通知和兜底 |
| `FEISHU_WEBHOOK_URL` | 飞书群机器人 |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` / `FEISHU_BASE_TOKEN` / `FEISHU_FEEDBACK_TABLE_ID` | 飞书多维表格反馈存档 |
| `COS_SECRET_ID` / `COS_SECRET_KEY` / `COS_BUCKET` / `COS_REGION` | 可选 COS 图片存储 |

不要提交真实 `.env`。

## API 速查

### 认证

- `POST /api/auth/send-code`：发送手机验证码。
- `POST /api/auth/verify-code`：验证验证码，返回 token 或 profile completion 临时 token。
- `POST /api/auth/setup-profile`：首次注册补昵称，可选孩子画像。
- `GET /api/auth/me`：校验当前 token。
- `POST /api/auth/accept-service-agreement`：已登录用户确认最新版《用户服务协议》。
- `GET /api/legal/service-agreement`：获取当前用户服务协议内容。

### 用户与隐私

- `GET /api/users/:id`：获取公开用户资料，敏感字段不返回。
- `PUT /api/users/:id`：当前登录用户修改自己的资料。
- `DELETE /api/users/:id`：当前登录用户主动注销自己的账号。注销为软注销，用户状态改为 `deactivated`，在架和预约中的发布会自动下架，历史记录按合规、安全、纠纷处理和审计需要保留。

前端隐私说明页为 `/privacy`。登录页通过 `/privacy?from=login` 打开，个人中心通过 `/privacy?from=profile` 打开。登录页只展示协议勾选行，不额外增加底部隐私小字。

### 物品

- `GET /api/items`：物品列表，支持类目、年龄、交换方式筛选。
- `GET /api/items/:id`：物品详情。
- `POST /api/items`：发布闲置或需求。
- `PUT /api/items/:id`：编辑并重新发布自己的物品或需求。
- `DELETE /api/items/:id`：删除自己的物品或管理员删除。管理员删除必须传 `reason`，后端会通知发布者。
- `PUT /api/items/:id/relist`：发布者重新上架已下架物品。
- `GET /api/items/admin/all`：管理员查看全量物品，包含已删除。
- `PUT /api/items/:id/restore`：管理员恢复已删除物品。

### 私信

- `GET /api/messages?user_id=...`：当前用户的所有私信。
- `POST /api/messages`：发送私信。发送后不再额外创建 notification。
- `PUT /api/messages/:id/read`：收件人标记私信已读。
- `GET /api/messages/conversations?user_id=...`：会话列表，含真实未读数。

### 通知

- `GET /api/notifications?user_id=...`：服务通知列表。
- `PUT /api/notifications/:id/read`：标记单条通知已读。
- `PUT /api/notifications/read-all`：批量已读。

前端通知页会过滤历史 `type='message'` 通知，私信只在“私信”里处理。

### 预约

- `GET /api/exchanges?item_id=...`：查询当前用户有权查看的预约。
- `POST /api/exchanges`：发起预约。
- `PUT /api/exchanges/:id/complete`：发布者确认交接。
- `PUT /api/exchanges/:id/cancel`：预约者取消。
- `PUT /api/exchanges/:id/fail`：双方之一标记未能成交。

预约支持候补。物品已被当前预约锁定时，新的预约会进入 `waiting`，返回 `queue_position`；前一位取消、失败或超时后自动顺延并通知候补用户。

### 反馈

- `POST /api/feedback`：提交投诉或建议。返回字段包含：
  - `providers`
  - `failed_providers`
  - `delivery_attempts`

用于判断飞书机器人、飞书多维表格、邮件兜底是否成功。

反馈类型统一为“举报投诉”或“建议”。管理员回复登录用户后，用户在“消息 → 通知”看到处理回复；未登录反馈只能根据联系方式线下处理。

### 管理后台

- `GET /api/admin/feedback`：管理员查看反馈与举报投诉。
- `POST /api/admin/feedback/:id/reply`：回复登录用户或更新反馈状态。
- `POST /api/admin/broadcast-notification`：发布平台通知，支持 `audience=all/community/users`。
- `PUT /api/admin/notifications/:id/recall`：撤回单条通知。
- `PUT /api/admin/notifications/recall-batch`：批量撤回通知。
- `GET /api/admin/service-agreement`：读取当前协议。
- `POST /api/admin/service-agreement/extract`：从上传文件提取协议文本。
- `POST /api/admin/service-agreement`：发布新的《用户服务协议》版本。
- `GET /api/admin/sensitive-words` / `POST /api/admin/sensitive-words` / `DELETE /api/admin/sensitive-words/:word` / `POST /api/admin/sensitive-words/reload`：管理动态敏感词。

人工通知只用于平台公告、运营提醒、处理通知；私信提醒和交换动态由系统自动触发。

## 前端可安装能力

`GET /manifest.webmanifest` 由 `h5/src/app/manifest.ts` 生成。桌面图标为 `/app-icon.svg`。浏览器支持 `beforeinstallprompt` 时首页会出现“添加到桌面”提示；微信内需要用户通过右上角菜单或外部浏览器完成。

## 后端发布注意

后端生产命令是 `node dist/index.js`。修改 `server/src/**` 后，必须执行：

```bash
cd server
npm run build
```

然后重启 `tonglin-api` 或当前后端 Node 进程。只重启旧 `dist` 而不 build，会继续运行旧逻辑。
