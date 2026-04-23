# 邻里童享 — 真实服务接入指南

> 以下是你需要申请的四个服务，以及对应的申请步骤。申请均为**免费**或**低成本**，后端代码已全部就绪。

---

## 一、腾讯地图（免费，必选）

### 申请地址
https://lbs.qq.com/

### 步骤
1. 访问腾讯位置服务官网，用微信扫码登录
2. 点击「控制台」→「应用管理」→「我的应用」→「创建应用」
3. 应用名称填「邻里童享」，类型选「WebServiceAPI」
4. 添加 Key：名称填「LBS定位」，类型选「客户端Key（ Web、腿书等 ）」，域名白名单填你的网站域名（开发阶段填 `localhost`）
5. 复制生成的 Key

### 配置到项目
```env
# h5/.env.local
NEXT_PUBLIC_TENCENT_MAP_KEY=你申请的Key
```

```env
# server/.env
TENCENT_MAP_KEY=你申请的Key
```

### 已完成的代码
- `h5/src/lib/tencentMap.ts` — 定位、逆地址解析、小区搜索
- `h5/src/context/AppContext.tsx` — GPS 自动获取用户位置

---

## 二、微信分享（免费）

### 前置条件
- 拥有一个**微信公众号**（订阅号即可，个人可注册）
- 公众号已完成**微信认证**（个人订阅号认证费用 300元/年）

### 步骤

**第一步：配置 JS 安全域名**
1. 登录微信公众平台 https://mp.weixin.qq.com/
2. 进入「设置与开发」→「公众号设置」→「功能设置」
3. 在「JS接口安全域名」中填入：
   - 开发阶段：`localhost`
   - 正式上线：`xiangyangkidswap.com`（你的域名）
4. 每月可修改3次，注意保存

**第二步：获取 AppID 和 AppSecret**
1. 公众平台首页 → 「设置与开发」→「开发」→「基本配置」
2. 复制 **AppID** 和 **AppSecret**（AppSecret 需要点击「重置」查看）

**第三步：部署后端签名接口**
```env
# server/.env
WECHAT_APP_ID=wx开头的AppID
WECHAT_APP_SECRET=AppSecret
SERVER_PUBLIC_URL=https://你的域名  # 用于生成签名
```

**第四步：前端配置**
```env
# h5/.env.local
NEXT_PUBLIC_WX_APP_ID=wx开头的AppID
```

### 已完成的代码
- `server/src/routes/wechat.ts` — `/api/wechat/signature` 签名接口
- `server/src/services/wechatSign.ts` — JS-SDK 签名算法
- `h5/src/lib/wechat.ts` — 分享到好友/朋友圈
- `h5/src/components/WeChatInit.tsx` — SDK 自动初始化

---

## 三、微信登录（免费，需开放平台账号）

### 说明
网页端（非微信内置浏览器）的微信登录需要**微信开放平台**账号。
微信内置浏览器中可以通过静默授权直接获取用户信息，无需开放平台。

### 申请开放平台（可选）
1. 访问 https://open.weixin.qq.com/
2. 注册账号（需要企业/个体工商户资质，个人无法申请）
3. 创建网站应用，填写 AppID 和 AppSecret
4. 配置授权回调域

**如果暂无开放平台账号**：用户可以通过昵称+小区手动登录，所有功能均可用。

### 已完成的代码
- `server/src/routes/wechat.ts` — `/api/wechat/callback` 授权回调
- `server/src/services/wechatAuth.ts` — openid 换取用户信息
- `h5/src/app/login/page.tsx` — 微信自动登录 + 手动登录

---

## 四、真实后端部署（阿里云/腾讯云）

### 当前状态
本地已有一个完整可运行的后端：
```
server/
├── src/
│   ├── index.ts           # Express 入口
│   ├── routes/           # API 路由（items/users/messages/wechat/auth）
│   ├── models/db.ts       # SQLite 数据库（sql.js）
│   └── services/          # 微信签名/认证服务
├── data/swap.db           # 自动创建的本地数据库
└── .env.example           # 环境变量模板
```

### 启动方式（本地）
```bash
cd server
npm install
npm run dev       # 开发模式
npm run build && npm start  # 生产模式
```

### 部署到云服务器
推荐使用**阿里云 ECS** 或**腾讯云轻量应用服务器**，Node.js 直接运行：

```bash
# 1. 上传代码到服务器
# 2. 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装依赖
npm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 填入真实参数

# 5. 用 PM2 运行（保持后台）
npm install -g pm2
pm2 start dist/index.js --name xiangyang-api
pm2 save
pm2 startup
```

### 配置 HTTPS（微信分享必需）
微信分享接口必须通过 HTTPS 访问，免费方案：
1. 申请域名（如 `xiangyangkidswap.com`）
2. 使用 **Let's Encrypt** 免费证书
3. 在 Nginx/Caddy 反向代理配置证书

### 前端环境变量（部署时更新）
```env
# h5/.env.production
NEXT_PUBLIC_API_BASE_URL=https://xiangyangkidswap.com
NEXT_PUBLIC_BASE_URL=https://xiangyangkidswap.com
NEXT_PUBLIC_WX_APP_ID=wx...
NEXT_PUBLIC_TENCENT_MAP_KEY=...
```

---

## 五、一键检查清单

| 事项 | 状态 | 备注 |
|------|------|------|
| 腾讯地图 Key | 待申请 | https://lbs.qq.com 免费 |
| 微信公众号 AppID | 待申请 | 个人订阅号可申请 |
| JS 安全域名配置 | 待配置 | 需公众号认证 |
| 服务器/HTTPS | 待部署 | 微信分享必需 HTTPS |
| 微信开放平台（可选） | 可选 | 仅影响非微信浏览器登录 |
| 后端 API 启动 | ✅ 已就绪 | `npm run dev` 即可 |
| 前端 API 连接 | ✅ 已就绪 | 指向 localhost:3001 |
