import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { initDatabase, run, getOne } from './models/db';

const PORT = process.env.PORT || 3001;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();

async function syncAdminFlags() {
  if (!ADMIN_EMAIL) {
    console.log('[Admin] ADMIN_EMAIL not configured, skipping sync');
    return;
  }
  try {
    // 找出所有需要设为管理员的用户
    const users = getOne(`SELECT id FROM users WHERE LOWER(email) = ? AND is_admin != 1`, [ADMIN_EMAIL]);
    if (users) {
      run('UPDATE users SET is_admin = 1 WHERE LOWER(email) = ?', [ADMIN_EMAIL]);
      console.log(`[Admin] 已将 ${ADMIN_EMAIL} 设为管理员`);
    }
  } catch (error) {
    console.error('[Admin] 管理员同步失败:', error);
  }
}

async function start() {
  await initDatabase();
  await syncAdminFlags();
  const app = createApp();
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`邻里童享 API 服务已启动: http://0.0.0.0:${PORT}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch(console.error);
