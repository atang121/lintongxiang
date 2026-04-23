#!/bin/bash
# ============================================================
# 邻里童享 - 服务器初始化脚本
# 在腾讯云轻量服务器（Ubuntu 22.04）上运行
# 用法：ssh root@你的IP 然后复制粘贴整段运行
# ============================================================

set -e

echo "🔧 开始初始化服务器..."

# ---- 1. 更新系统 ----
echo "📦 更新系统软件包..."
apt update && apt upgrade -y

# ---- 2. 安装 Node.js 18.x ----
echo "📦 安装 Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 验证
node -v
npm -v

# ---- 3. 安装 Git ----
echo "📦 安装 Git..."
apt install -y git

# ---- 4. 安装 PM2（进程守护）----
echo "📦 安装 PM2..."
npm install -g pm2

# ---- 5. 开放防火墙端口 ----
echo "🔒 开放防火墙端口（80/443/22）..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ---- 6. 创建项目用户（可选，建议）----
# 如果你想用非 root 用户运行，注释掉下面几行
# echo "👤 创建部署用户..."
# adduser deploy
# usermod -aG sudo deploy
# mkdir -p /home/deploy/.ssh
# cp ~/.ssh/authorized_keys /home/deploy/.ssh/
# chown -R deploy:deploy /home/deploy/.ssh

echo ""
echo "✅ 服务器初始化完成！"
echo ""
echo "下一步："
echo "1. 把项目代码传到服务器："
echo "   git clone https://github.com/你的用户名/仓库名.git /var/www/lintongxiang"
echo ""
echo "2. 配置环境变量："
echo "   cd /var/www/lintongxiang/server"
echo "   cp .env.production.example .env"
echo "   nano .env  # 编辑填入真实值"
echo ""
echo "3. 安装依赖并构建："
echo "   cd /var/www/lintongxiang/server"
echo "   npm install"
echo "   npm run build"
echo ""
echo "4. 用 PM2 启动服务："
echo "   pm2 start dist/index.js --name lintongxiang-api"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "5. 配置 Nginx（见 nginx.conf）"
echo ""
echo "6. 如果需要 HTTPS："
echo "   apt install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d your-domain.com"
