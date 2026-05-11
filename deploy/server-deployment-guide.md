# 童邻市集 · 部署到腾讯云指南

## 准备工作

### 1. 获取腾讯云服务器信息

登录 [腾讯云控制台](https://console.cloud.tencent.com/)，进入：

**云服务器 CVM → 实例 → 记录公网 IP**

常用入口：
- 轻量应用服务器：https://console.cloud.tencent.com/lighthouse
- 云服务器 CVM：https://console.cloud.tencent.com/cvm

### 2. 安全组配置

确保服务器安全组开放以下端口：

| 端口 | 用途 | 协议 |
|------|------|------|
| 22 | SSH | TCP |
| 80 | HTTP | TCP |
| 443 | HTTPS | TCP |

**操作步骤：**
1. 进入安全组设置
2. 添加入站规则：
   - 来源：0.0.0.0/0
   - 协议端口：TCP:22,80,443
   - 策略：允许

### 3. 域名解析

在 Cloudflare 中添加 DNS 记录（参考 `cloudflare-dns-guide.md`）：

```
A 记录：
- www.tonglinhui.cn → 服务器公网 IP
- tonglinhui.cn → 服务器公网 IP
```

## 连接服务器

### 方式一：SSH 密码登录

```bash
ssh ubuntu@你的服务器IP
# 输入密码：Tonglinhui168
```

### 方式二：SSH 密钥登录（推荐）

如果已有密钥，添加到腾讯云：

```bash
ssh -i ~/.ssh/your_key.pem ubuntu@你的服务器IP
```

## 一键部署

连接到服务器后，执行以下命令：

### 1. 下载部署脚本

```bash
# 创建目录
mkdir -p deploy && cd deploy

# 下载部署脚本
curl -LO https://raw.githubusercontent.com/atang121/lintongxiang/main/deploy/deploy.sh

# 添加执行权限
chmod +x deploy.sh
```

### 2. 运行部署脚本

```bash
sudo ./deploy.sh
```

### 3. 手动部署（如脚本失败）

如果脚本有问题，按以下步骤手动部署：

```bash
# 3.1 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# 3.2 安装 Nginx
sudo apt-get install -y nginx

# 3.3 创建网站目录
sudo mkdir -p /var/www/tonglinhui
cd /var/www/tonglinhui

# 3.4 克隆代码
sudo apt-get install -y git
sudo -u www-data git clone https://github.com/atang121/lintonghui.git .

# 3.5 构建前端
cd /var/www/tonglinhui/h5
sudo -u www-data npm install
sudo -u www-data NEXT_PUBLIC_API_BASE_URL=https://www.tonglinhui.cn/api \
              NEXT_PUBLIC_BASE_URL=https://www.tonglinhui.cn \
              npm run build

# 3.6 构建后端
cd /var/www/tonglinhui/server
sudo -u www-data npm install
sudo -u www-data npm run build

# 3.7 配置环境变量
sudo nano /var/www/tonglinhui/server/.env
# （参考 .env.example 填写配置）

# 3.8 配置 Nginx
sudo nano /etc/nginx/sites-available/tonglinhui
# （粘贴 Nginx 配置，参考 deploy/deploy.sh）

sudo ln -sf /etc/nginx/sites-available/tonglinhui /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 3.9 启动 PM2
cd /var/www/tonglinhui/server
sudo -u www-data pm2 start dist/index.js --name tonglin-api
sudo -u www-data pm2 save
sudo -u www-data pm2 startup

# 3.10 获取 SSL 证书
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d www.tonglinhui.cn -d tonglinhui.cn
```

## 验证部署

### 1. 检查服务状态

```bash
# 查看 PM2 状态
sudo -u www-data pm2 status

# 查看 Nginx 状态
sudo systemctl status nginx

# 查看端口监听
sudo ss -tlnp | grep -E '80|443|3001'
```

### 2. 测试访问

```bash
# 测试首页
curl -I https://www.tonglinhui.cn

# 测试 API
curl https://www.tonglinhui.cn/api/health
```

### 3. 查看日志

```bash
# PM2 日志
sudo -u www-data pm2 logs tonglin-api

# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

## 后续配置

### 1. 配置环境变量

```bash
sudo nano /var/www/tonglinhui/server/.env
```

必须修改：
- `JWT_SECRET` - 强随机字符串
- `ADMIN_TOKEN` - 管理员令牌
- `SMS_*` - 腾讯云短信配置（启用真实短信）
- `SMTP_*` - 邮件配置

修改后重启：
```bash
sudo -u www-data pm2 restart tonglin-api
```

### 2. 配置定时备份

```bash
# 创建备份脚本
sudo nano /etc/cron.daily/tonglinhui-backup
```

### 3. 配置防火墙

```bash
# 启用防火墙
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

## 常见问题

### Q: 连接被拒绝
- 检查安全组是否开放 22 端口
- 检查服务器 IP 是否正确

### Q: 部署脚本报错
- 手动按步骤执行（见上文"手动部署"）
- 检查系统版本（需要 Ubuntu 20.04+）

### Q: SSL 证书申请失败
- 确保域名已正确解析到服务器 IP
- 等待 DNS 生效（可能需要几分钟）
- 手动运行：`sudo certbot --nginx -d www.tonglinhui.cn`

### Q: PM2 无法启动
- 检查 Node.js 版本：`node -v`（需要 18+）
- 检查 .env 配置是否正确
- 查看详细日志：`pm2 logs tonglin-api --err`

## 常用运维命令

```bash
# 查看服务状态
pm2 status

# 重启服务
pm2 restart tonglin-api

# 查看日志
pm2 logs tonglin-api

# 更新代码并重启
cd /var/www/tonglinhui && git pull && cd server && npm run build && pm2 restart tonglin-api

# 备份数据库
cp /var/www/tonglinhui/server/data/swap.db /var/backups/swap-$(date +%Y%m%d).db

# 查看磁盘使用
df -h
du -sh /var/www/tonglinhui
```
