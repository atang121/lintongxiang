{
  "name": "lintongxiang-api",
  "script": "dist/index.js",
  "cwd": "/var/www/lintongxiang/server",
  "instances": 1,
  "autorestart": true,
  "watch": false,
  "max_memory_restart": "500M",
  "env": {
    "NODE_ENV": "production",
    "PORT": 3001
  },
  "error_file": "/var/log/pm2/lintongxiang-error.log",
  "out_file": "/var/log/pm2/lintongxiang-out.log",
  "log_date_format": "YYYY-MM-DD HH:mm:ss",
  "merge_logs": true
}
