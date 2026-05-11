# 童邻市集架构说明

更新日期：2026-05-05

## 系统边界

童邻市集是一个 H5 + API 的小区儿童闲置流转平台。首批定位为襄阳东门口周边 5 个相邻小区，暂不做距离计算和定位排序。

- 前端：`h5/`，Next.js App Router，端口 `3000`
- 后端：`server/`，Express + TypeScript，端口 `3001`
- 数据：`server/data/swap.db`，sql.js 持久化 SQLite
- 运维：`tools/local-ops-dashboard/` 本机面板 + `server/scripts/backup-sqlite.sh`

## 核心数据模型

- `users`：用户、手机号、昵称、小区、孩子画像、状态、交换次数、管理员/联络员标记。
- `items`：物品或需求，`listing_type` 区分 `offer` 和 `wanted`，`status` 为 `available/pending/completed/deleted`。
- `messages`：私信。私信只在消息页“私信”里展示和回复，不再额外生成通知。
- `exchanges`：预约和交接状态机。
- `notifications`：预约、系统、管理员广播等服务通知。历史 message 类型通知前端会过滤。
- `feedback_entries`：投诉与建议，附带飞书/邮件投递诊断。
- `review_queue`：发布审核队列，管理员可通过/拒绝。
- `service_agreements`：后台发布的用户服务协议版本；用于判断用户是否需要重新确认。
- `view_logs` / `search_logs`：浏览和搜索行为，用于后续聚合画像。
- `auth_codes` / `sms_send_logs`：手机验证码与发送频率控制。

## 前端流程

### 登录注册

手机号验证码登录。首次注册要求昵称和小区；孩子年龄段和孩子数量为选填，可跳过。前端本地保存 token 和 user，并在启动时异步调用 `/api/auth/me` 校验。

内置试点小区为梧桐湾、清华园、丽江泊林、在水一方、怡和苑。注册时从内置小区中选择，找不到可手动添加；个人中心修改小区只保留手动填写。

账号级《用户服务协议》是合规入口。注册/登录需勾选同意；协议更新后，已登录用户在发布、私信、预约或响应需求前通过全局弹窗补确认。前端优先信任后端返回的 `service_agreement_required`，避免前端静态版本与后台版本不一致。

### 发布与浏览

发布闲置必须至少上传 1 张图片。发布需求可以无图，无图时 `WantedCover` 根据标题、类目、年龄、预算生成需求封面。

物品详情用 `ItemImageCarousel` 展示多图：支持触摸滑动、缩略图、计数，横图/竖图用模糊背景和 `object-contain` 保持观感稳定。

### 预约状态机

```text
available item
  -> POST /api/exchanges
  -> item=pending, exchange=pending

pending exchange
  -> owner PUT /api/exchanges/:id/complete
  -> item=completed, exchange=completed, 双方 exchange_count +1

pending / waiting exchange
  -> requester PUT /api/exchanges/:id/cancel
  -> exchange=cancelled, 当前预约取消后 item 恢复 available 或顺延下一位候补

pending exchange
  -> participant PUT /api/exchanges/:id/fail
  -> exchange=failed, item 恢复 available 或顺延下一位候补

waiting exchange
  -> 前一位取消/失败/超时
  -> 自动晋升为 pending，并通知候补用户
```

完成交接只能由发布者确认。预约者可以取消预约、联系发布者、提醒确认；取消、失败或超时后可重新预约。私信页也能对关联物品直接预约、重新预约或加入候补。

### 私信与通知

私信页将同一物品 + 同一对用户聚合为会话。打开会话会把对方发来的未读消息标记已读，底部可直接回复。

通知页只显示非 message 类型通知，避免“私信列表”和“通知列表”重复。全局未读红点为未读私信数 + 未读服务通知数。

反馈处理回复、管理员处理通知、预约状态变化走 `notifications`。私信只保留角标和会话未读数。

## 管理后台

管理后台包含物品、用户、交换、反馈、敏感词、协议、通知运营等模块。

- 物品：管理员删除必须填写原因，后端写入 `delete_reason/deleted_by/deleted_at`，并给发布者发送 `handling` 通知。
- 反馈：管理员可查看反馈/举报投诉，给已登录用户站内回复；用户在“消息 → 通知”查看。
- 通知运营：人工只发布平台公告、运营提醒、处理通知；支持全员、指定小区、指定用户；交换动态由预约流程自动触发，私信不由管理员群发。
- 协议：支持上传 `.docx` / `.txt` / `.md` 或粘贴正文，发布新的《用户服务协议》版本。
- 敏感词：支持动态词库管理和 reload；发布场景对协议禁发内容直接拦截。

### PWA 添加到桌面

`src/app/manifest.ts` 输出 `manifest.webmanifest`，图标为 `/app-icon.svg`。首页 `InstallAppPrompt` 使用 `beforeinstallprompt` 触发浏览器安装；微信内提示用户先用右上角菜单或浏览器菜单添加到桌面。

## 集成

- 飞书群机器人：反馈提交后发群通知。
- 飞书多维表格：反馈存档、小区配置、运营配置。
- 邮件：反馈兜底通知。
- 微信 JS-SDK：分享签名和分享文案配置。
- 腾讯云 COS：可选图片存储；未配置时用本地 `server/data/uploads/`。
- 腾讯云短信：可选真实短信；未启用时开发环境 preview，生产环境拒绝返回 preview 验证码。

## 合规与风控

- 平台仅提供邻里信息展示、沟通与预约工具，不参与交易、不提供担保。
- 《用户服务协议》覆盖账号注册、平台定位、发布承诺、物品提供承诺、交易安全、免责声明与争议处理。
- 禁止发布宠物或活物，以及协议禁止的食品药品、贴身卫生用品、危险品、侵权仿冒等内容。
- 活物识别包含明确词和上下文规避表达，例如“小伙伴”“不养了”“名字叫”等组合。

## 安全约束

- 生产环境必须配置强 `JWT_SECRET`。
- 上传限制 MIME、扩展名和 category。
- 预约查询、创建、完成、取消、失败都按当前登录身份校验。
- 公开用户详情不返回手机号、邮箱、openid 等敏感字段。
- 空生产库不自动灌 demo 数据。
- 管理恢复用户状态时同步恢复其被系统下架的物品。
- 修改后端源码后，若运行服务是 `server/dist/index.js`，必须先 `npm run build` 再重启后端；否则线上仍执行旧逻辑。
