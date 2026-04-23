import express from 'express';
import cors from 'cors';
import path from 'path';

import { itemsRouter } from './routes/items';
import { usersRouter } from './routes/users';
import { messagesRouter } from './routes/messages';
import { wechatRouter } from './routes/wechat';
import { authRouter } from './routes/auth';
import { mapRouter } from './routes/map';
import { exchangesRouter } from './routes/exchanges';
import { notificationsRouter } from './routes/notifications';
import { adminRouter } from './routes/admin';
import { opsRouter } from './routes/ops';
import { uploadsRouter } from './routes/uploads';
import { feedbackRouter } from './routes/feedback';
import { getLocalUploadsDir } from './services/storage';

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((entry) => entry.trim());

  app.use(cors({
    origin: (origin, callback) => {
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
        return;
      }

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '15mb' }));
  app.use('/uploads', express.static(path.resolve(getLocalUploadsDir())));

  app.use('/api/items', itemsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/wechat', wechatRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/map', mapRouter);
  app.use('/api/exchanges', exchangesRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/ops', opsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/feedback', feedbackRouter);

  app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  return app;
}
