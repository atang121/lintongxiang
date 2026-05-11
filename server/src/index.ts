import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { initDatabase } from './models/db';

const PORT = process.env.PORT || 3001;

async function start() {
  await initDatabase();
  const app = createApp();
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`童邻市集 API 服务已启动: http://0.0.0.0:${PORT}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch(console.error);
