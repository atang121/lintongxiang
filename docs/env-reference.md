# 童邻市集环境变量说明

更新日期：2026-05-11

## 文件位置

- 后端：`server/.env`
- 后端模板：`server/.env.example`
- 前端：`h5/.env.local`
- 前端模板：`h5/.env.local.example`

不要提交真实 `.env` 或 `.env.local`。误覆盖时，先从模板复制，再补真实密钥。

## 后端必填

| 变量 | 作用 |
|---|---|
| `NODE_ENV` | 生产必须为 `production`，否则空库可能灌 demo，短信可能进入 preview |
| `PORT` | API 端口，本地默认 `3001` |
| `JWT_SECRET` | 登录 token 签名密钥，必须是 32 字符以上强随机字符串 |
| `FRONTEND_URL` | CORS 允许的前端地址，多个用英文逗号分隔 |
| `SERVER_PUBLIC_URL` | 后端公网地址，用于图片、微信回调和签名 |
| `ADMIN_PHONES` | 管理员手机号，多个用英文逗号分隔 |

## 腾讯云短信

| 变量 | 说明 |
|---|---|
| `SMS_ENABLED` | 真实短信开关。生产上线应为 `true` |
| `TENCENT_SECRET_ID` | 腾讯云 API 访问密钥 SecretId |
| `TENCENT_SECRET_KEY` | 腾讯云 API 访问密钥 SecretKey |
| `TENCENT_SMS_SDK_APP_ID` | 短信控制台的 SDKAppID |
| `TENCENT_SMS_SIGN` | 短信签名 |
| `TENCENT_SMS_TEMPLATE_ID` | 短信模板 ID |
| `TENCENT_SMS_REGION` | 默认 `ap-guangzhou` |

注意：`TENCENT_SECRET_ID/TENCENT_SECRET_KEY` 和 `TENCENT_SMS_SDK_APP_ID` 必须属于同一个腾讯云账号。旧字段 `TENCENT_SMS_APP_ID` 仅做兼容，不建议继续依赖。

## 飞书

| 变量 | 作用 |
|---|---|
| `FEISHU_WEBHOOK_URL` | 群机器人 Webhook |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 飞书应用凭证 |
| `FEISHU_BASE_TOKEN` | 多维表格 app token |
| `FEISHU_FEEDBACK_TABLE_ID` | 反馈/举报投诉表 |
| `FEISHU_COMMUNITIES_TABLE_ID` | 小区配置表，可选 |
| `FEISHU_OPS_CONFIG_TABLE_ID` | 运营配置表，可选 |
| `FEISHU_REVIEW_TABLE_ID` | 审核记录表，可选 |

## 邮件

| 变量 | 作用 |
|---|---|
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | SMTP 服务器配置 |
| `SMTP_USER` / `SMTP_PASS` | 发件邮箱和授权码 |
| `SMTP_FROM` | 邮件发件人展示 |
| `FEEDBACK_RECEIVER` | 反馈通知收件人 |
| `SUPPORT_EMAIL` | 平台支持邮箱 |

## 图片存储

| 变量 | 作用 |
|---|---|
| `STORAGE_PROVIDER` | `local` 或 `cos` |
| `STORAGE_PUBLIC_BASE_URL` | 自定义上传文件公网前缀，可选 |
| `COS_SECRET_ID` / `COS_SECRET_KEY` | 腾讯云 COS 密钥 |
| `COS_BUCKET` / `COS_REGION` | COS 存储桶和地域 |
| `COS_PUBLIC_BASE_URL` | COS 自定义 CDN/公网前缀，可选 |

当前小范围本机运营可用 `local`；公网长期运营建议改 COS。

## 前端必填

| 变量 | 作用 |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | API 地址，必须带 `/api` |
| `NEXT_PUBLIC_BASE_URL` | H5 页面地址 |

前端可选：

| 变量 | 作用 |
|---|---|
| `NEXT_PUBLIC_WX_APP_ID` | 微信 JS-SDK AppID |
| `NEXT_PUBLIC_TENCENT_MAP_KEY` | 腾讯地图 Key |
| `NEXT_PUBLIC_JIGUANG_APP_KEY` | 极光推送 AppKey |
| `NEXT_PUBLIC_DEMO_ADMIN_TOKEN` | 演示重置入口口令；生产后端已禁用 reset-demo |

## 上线最低检查

```bash
cd server
npm run build
npm start
```

```bash
curl -s http://127.0.0.1:3001/api/health
curl -s -X POST http://127.0.0.1:3001/api/auth/send-code \
  -H 'Content-Type: application/json' \
  -d '{"phone":"你的测试手机号"}'
```

生产环境短信接口成功时应返回 `provider: "tencent"`，且不能包含 `preview_code`。
