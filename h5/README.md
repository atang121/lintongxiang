# 童邻市集 H5 前端

这是“童邻市集”的移动端优先 H5，面向襄阳东门口周边试点小区的儿童闲置物品交换、赠送、求购和邻里沟通。

## 运行

默认开发模式使用 webpack，避免本机缓存多时 Turbopack 占用过高：

```bash
npm run dev
```

打开 `http://localhost:3000`。手机真机访问时使用电脑局域网 IP，例如 `http://192.168.x.x:3000`，后端 API 默认在 `3001`。

其他命令：

```bash
npm run dev:lite
npm run dev:turbo
npm run build
npm run start
```

## 验证

```bash
node --test test/*.mjs
npm exec tsc -- --noEmit
npm run build
```

## 当前关键体验

- 登录注册：手机号验证码，首次注册强制昵称和小区，孩子年龄段和数量可跳过；协议更新时通过全局弹窗补确认。
- 小区：内置梧桐湾、清华园、丽江泊林、在水一方、怡和苑，注册时可选，找不到可手动添加。
- 首页：按东门口周边试点小区展示，首期不做距离计算。
- 发布：闲置必须传图；需求可无图，使用 `WantedCover` 生成干净封面。
- 发布管理：已发布内容可编辑后重新发布，发布者可下架。
- 详情：`ItemImageCarousel` 支持多图滑动、横竖图统一视觉；底部动作按身份显示预约、候补、取消、提醒确认、发布者确认交接。
- 私信：消息页可打开会话并回复，也可对关联物品直接预约、重新预约或加入候补；私信不再重复进入通知列表。
- 通知：只承接预约、反馈处理、管理员处理和系统通知。
- 合规：禁发宠物/活物、食品药品、贴身卫生风险、危险品、侵权仿冒等协议禁止内容。
- 添加到桌面：`manifest.ts` + `/app-icon.svg` + `InstallAppPrompt`，支持浏览器 PWA 安装提示和微信内操作指引。

## 重要文件

- `src/app/page.tsx`：首页和新用户欢迎提示
- `src/app/items/[id]/page.tsx`：物品详情、预约动作、分享/收藏反馈
- `src/app/messages/page.tsx`：私信会话、回复、通知分流
- `src/app/publish/page.tsx`：发布闲置/需求
- `src/app/admin/page.tsx`：管理员后台、反馈、通知、协议、敏感词
- `src/components/ServiceAgreementUpdatePrompt.tsx`：协议更新确认弹窗
- `src/components/ItemImageCarousel.tsx`：详情图轮播
- `src/components/WantedCover.tsx`：需求无图封面
- `src/components/InstallAppPrompt.tsx`：添加到桌面提示
- `src/context/AppContext.tsx`：前端状态、API 串联、未读计数

## 环境变量

模板在 `.env.local.example`：

- `NEXT_PUBLIC_API_BASE_URL`：API 地址，本地为 `http://localhost:3001/api`
- `NEXT_PUBLIC_BASE_URL`：正式站点地址，用于 meta / 分享
- `NEXT_PUBLIC_WX_APP_ID`：微信 JS-SDK
- `NEXT_PUBLIC_TENCENT_MAP_KEY`：腾讯地图，首期可不启用距离定位

不要提交真实 `.env.local`。
