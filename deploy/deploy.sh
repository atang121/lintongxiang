#!/bin/bash
# ===========================================
# 童邻市集 · 腾讯云一键部署脚本
# 适用于 Ubuntu 20.04+ / Node.js 18+
# ===========================================

set -e

# 配置变量
APP_DIR="/var/www/tonglinhui"
REPO_URL="https://github.com/atang121/lintongxiang.git"
NODE_VERSION="18"
DOMAIN="www.tonglinhui.cn"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then
  log_error "请使用 sudo 运行此脚本"
  exit 1
fi

log_info "开始部署童邻市集..."

# ============ 1. 安装依赖 ============
log_info "1. 安装 Node.js 和依赖..."

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# 安装 PM2
npm install -g pm2

# 安装 Nginx
apt-get install -y nginx certbot python3-certbot-nginx

# ============ 2. 创建目录并拉取代码 ============
log_info "2. 拉取代码..."

mkdir -p $APP_DIR
cd $APP_DIR

# 如果目录已有代码，先备份
if [ -d ".git" ]; then
    log_warn "检测到已有代码，执行 git pull..."
    sudo -u www-data git pull origin main
else
    sudo -u www-data git clone $REPO_URL $APP_DIR
fi

# ============ 3. 安装前端依赖并构建 ============
log_info "3. 构建前端..."

cd $APP_DIR/h5
sudo -u www-data npm install
sudo -u www-data NEXT_PUBLIC_API_BASE_URL=https://$DOMAIN/api \
              NEXT_PUBLIC_BASE_URL=https://$DOMAIN \
              npm run build

# ============ 4. 安装后端依赖并构建 ============
log_info "4. 构建后端..."

cd $APP_DIR/server
sudo -u www-data npm install
sudo -u www-data npm run build

# ============ 5. 配置环境变量 ============
log_info "5. 配置环境变量..."

# 创建生产环境 .env 文件
cat > $APP_DIR/server/.env << 'EOF'
# ===== 童邻市集 · 生产环境配置 =====
# ⚠️ 请根据实际情况修改以下配置

NODE_ENV=production
PORT=3001

# 前端地址
FRONTEND_URL=https://www.tonglinhui.cn

# JWT 密钥（必须修改为强随机字符串）
JWT_SECRET=change_this_to_random_string_at_least_32_chars_here
JWT_EXPIRES_IN=30d

# 管理员 Token（必须修改）
ADMIN_TOKEN=change_this_to_admin_token_here
ADMIN_PHONES=15271090260

# 服务器公网地址
SERVER_PUBLIC_URL=https://www.tonglinhui.cn

# 腾讯云短信（启用前必须配置）
SMS_ENABLED=false
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
TENCENT_SMS_SDK_APP_ID=your_sdk_app_id
TENCENT_SMS_SIGN=童邻市集
TENCENT_SMS_TEMPLATE_ID=your_template_id
TENCENT_SMS_REGION=ap-guangzhou

# SMTP 配置
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_pass
SMTP_FROM="童邻市集 <your_email@example.com>"
FEEDBACK_RECEIVER=your_email@example.com

# 飞书配置（可选）
FEISHU_WEBHOOK_URL=
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_BASE_TOKEN=
FEISHU_FEEDBACK_TABLE_ID=

# COS 配置（可选，不配置则使用本地存储）
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=ap-guangzhou
EOF

# 设置权限
chown www-data:www-data $APP_DIR/server/.env
chmod 600 $APP_DIR/server/.env

# ============ 6. 配置 Nginx ============
log_info "6. 配置 Nginx..."

cat > /etc/nginx/sites-available/tonglinhui << 'EOF'
# 前端静态文件
server {
    listen 80;
    server_name www.tonglinhui.cn tonglinhui.cn;

    root /var/www/tonglinhui/h5/.next;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain application/javascript text/css image/svg+xml;
    gzip_min_length 1000;

    # Next.js 请求代理
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 请求代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件代理
    location /uploads/ {
        proxy_pass http://127.0.0.1:3001/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name tonglinhui.cn;
    return 301 https://$host$request_uri;
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/tonglinhui /etc/nginx/sites-enabled/

# 测试 Nginx 配置
nginx -t

# 重启 Nginx
systemctl restart nginx

# ============ 7. 配置 PM2 ============
log_info "7. 配置 PM2..."

# 创建 PM2 配置文件
cat > $APP_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'tonglin-api',
      script: 'dist/index.js',
      cwd: '/var/www/tonglinhui/server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/pm2/tonglin-api-error.log',
      out_file: '/var/log/pm2/tonglin-api-out.log',
      time: true
    }
  ]
};
EOF

# 创建日志目录
mkdir -p /var/log/pm2

# 使用 www-data 用户启动 PM2
chown -R www-data:www-data $APP_DIR

# 停止旧进程
sudo -u www-data pm2 delete tonglin-api 2>/dev/null || true

# 启动新进程
cd $APP_DIR/server
sudo -u www-data pm2 start $APP_DIR/ecosystem.config.js --name tonglin-api

# 保存 PM2 配置
sudo -u www-data pm2 save

# 设置开机自启
sudo -u www-data pm2 startup systemd -u www-data

# ============ 8. 获取 SSL 证书 ============
log_info "8. 配置 SSL 证书..."

certbot --nginx -d www.tonglinhui.cn -d tonglinhui.cn --noninteractive --agree-tos --email admin@tonglinhui.cn --redirect || {
    log_warn "SSL 证书申请失败，请手动运行: certbot --nginx -d www.tonglinhui.cn"
}

# ============ 9. 创建备份脚本 ============
log_info "9. 创建定时备份..."

cat > /etc/cron.daily/tonglinhui-backup << 'EOF'
#!/bin/bash
# 每日数据库备份
BACKUP_DIR="/var/backups/tonglinhui"
mkdir -p $BACKUP_DIR
cp /var/www/tonglinhui/server/data/swap.db $BACKUP_DIR/swap-$(date +%Y%m%d).db
# 保留 30 天备份
find $BACKUP_DIR -name "swap-*.db" -mtime +30 -delete
EOF

chmod +x /etc/cron.daily/tonglinhui-backup
mkdir -p /var/backups/tonglinhui

# ============ 10. 完成 ============
log_info ""
log_info "============================================"
log_info "  部署完成！"
log_info "============================================"
log_info ""
log_info "访问地址: https://www.tonglinhui.cn"
log_info "API 地址: https://www.tonglinhui.cn/api"
log_info ""
log_info "后续操作:"
log_info "1. 修改 server/.env 中的敏感配置"
log_info "2. 配置腾讯云短信（SMS_ENABLED=true）"
log_info "3. 配置飞书 webhook（如需要）"
log_info "4. 重启后端: pm2 restart tonglin-api"
log_info ""
log_info "常用命令:"
log_info "  pm2 status          # 查看状态"
log_info "  pm2 logs tonglin-api  # 查看日志"
log_info "  pm2 restart tonglin-api  # 重启"
log_info "============================================"
