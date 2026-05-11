import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
import { behaviorRouter } from './routes/behavior';
import { getLocalUploadsDir } from './services/storage';
import { genericRateLimiter } from './middleware/rateLimit';
import { getLatestServiceAgreement } from './services/serviceAgreement';

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((entry) => entry.trim());

  // 基础中间件
  app.use(express.json({ limit: '15mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static(path.resolve(getLocalUploadsDir())));

  const sendServiceAgreement = (_req: express.Request, res: express.Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(getLatestServiceAgreement());
  };
  app.get('/legal/service-agreement.json', sendServiceAgreement);
  app.get('/api/legal/service-agreement', sendServiceAgreement);

  // CORS 配置
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

  // 全局限流（通用）
  app.use('/api/', genericRateLimiter);

  // API 路由
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
  app.use('/api/behavior', behaviorRouter);

  app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // BUG-32/33: 全局错误处理中间件（必须放在所有路由之后）
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Unhandled Error]', err.message || err);
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      // 生产环境不暴露错误详情
      res.status(500).json({ error: '服务器内部错误，请稍后重试' });
    } else {
      // 开发环境返回详细错误信息
      res.status(500).json({
        error: '服务器内部错误',
        message: err.message || 'Unknown error',
        stack: err.stack,
      });
    }
  });

  return app;
}
