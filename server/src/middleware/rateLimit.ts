import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { getOne, run } from '../models/db';

// 通用限流器 - 超过限制时返回 429
const genericRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟窗口
  max: 100, // 最多 100 请求 per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: '请求过于频繁，请稍后再试' });
  },
});

// 每手机号每日发送次数上限
const DAILY_CODE_LIMIT = 10;

// 确保短信发送记录表存在
let smsLogTableChecked = false;
function ensureSmsLogTable() {
  if (smsLogTableChecked) return;
  smsLogTableChecked = true;
  try {
    run(`
      CREATE TABLE IF NOT EXISTS sms_send_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        ip TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    run('CREATE INDEX IF NOT EXISTS idx_sms_send_logs_phone_date ON sms_send_logs(phone, date(created_at))');
  } catch {
    smsLogTableChecked = false;
  }
}

// 检查手机号今日发送次数，超过限制则拒绝
export function checkDailySmsLimit(phone: string): { allowed: boolean; remaining: number } {
  ensureSmsLogTable();
  const row = getOne(
    "SELECT COUNT(*) as count FROM sms_send_logs WHERE phone = ? AND date(created_at) = date('now')",
    [phone]
  ) as Record<string, any> | null;
  const count = row?.count || 0;
  return { allowed: count < DAILY_CODE_LIMIT, remaining: Math.max(0, DAILY_CODE_LIMIT - count) };
}

// 记录一次短信发送
export function recordSmsSend(phone: string, ip: string): void {
  ensureSmsLogTable();
  run('INSERT INTO sms_send_logs (phone, ip) VALUES (?, ?)', [phone, ip]);
}

// 验证码发送限流 - 每 IP 每手机号/邮箱 1分钟1次
export const sendCodeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟窗口
  max: 1, // 1 次 per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // 按 IP + 手机号/邮箱 作为 key，使用 ipKeyGenerator 处理 IPv6
    const ip = ipKeyGenerator(req.ip || '');
    const phone = req.body?.phone || req.body?.email || '';
    return `${ip}:${phone}`;
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: '验证码发送过于频繁，请1分钟后再试' });
  },
});

// 登录验证限流 - 每 IP 5分钟最多5次
export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 分钟窗口
  max: 5, // 5 次 per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // 使用 ipKeyGenerator 处理 IPv6
    return ipKeyGenerator(req.ip || '');
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: '登录尝试次数过多，请稍后再试' });
  },
});

// 验证码校验限流 - 错误5次后锁定5分钟
const verifyAttempts: Map<string, { count: number; lockedUntil: number }> = new Map();

export const verifyCodeLimiter = (req: Request, res: Response, next: Function) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const phone = req.body?.phone || req.body?.email || '';

  if (!phone) {
    return next();
  }

  const key = `${ip}:${phone}`;
  const record = verifyAttempts.get(key);

  if (record) {
    if (Date.now() < record.lockedUntil) {
      return res.status(429).json({
        error: '验证码错误次数过多，请5分钟后再试'
      });
    }
    // 锁定时间已过，清除记录
    if (Date.now() >= record.lockedUntil) {
      verifyAttempts.delete(key);
    }
  }

  next();
};

// 记录验证码错误 - 5次错误后锁定
export function recordVerifyFailure(req: Request): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const phone = req.body?.phone || req.body?.email || '';
  const key = `${ip}:${phone}`;

  const record = verifyAttempts.get(key);
  if (record) {
    record.count++;
    if (record.count >= 5) {
      record.lockedUntil = Date.now() + 5 * 60 * 1000; // 锁定5分钟
    }
  } else {
    verifyAttempts.set(key, { count: 1, lockedUntil: 0 });
  }
}

// 清除验证记录（成功后调用）
export function clearVerifyRecord(req: Request): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const phone = req.body?.phone || req.body?.email || '';
  const key = `${ip}:${phone}`;
  verifyAttempts.delete(key);
}

export { genericRateLimiter };

// BUG-39: 图片上传限流 — 每用户 10次/小时
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // 使用 ipKeyGenerator 处理 IPv6
    return ipKeyGenerator(req.ip || '');
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: '上传过于频繁，请1小时后再试' });
  },
});

// BUG-40: 反馈提交限流 — 每 IP 5次/小时
export const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // 使用 ipKeyGenerator 处理 IPv6
    return ipKeyGenerator(req.ip || '');
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: '反馈提交过于频繁，请1小时后再试' });
  },
});

// BUG-41: 物品发布限流 — 每用户 10次/小时
export const publishLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // 使用 ipKeyGenerator 处理 IPv6
    return ipKeyGenerator(req.ip || '');
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: '发布过于频繁，请1小时后再试' });
  },
});
