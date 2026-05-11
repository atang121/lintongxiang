#!/bin/zsh
set -e

cd "$(dirname "$0")"
echo "正在启动童邻市集本机运维面板..."
echo "打开地址：http://127.0.0.1:4318"
echo
node tools/local-ops-dashboard/server.mjs
