import jwt from 'jsonwebtoken';
import { getOne } from '../models/db';

// 延迟获取 JWT_SECRET（因为 dotenv 在 index.ts 中加载，可能晚于模块初始化）
export function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET || '';
  if (envSecret) return envSecret;
  // 开发环境 fallback
  if (process.env.NODE_ENV !== 'production') {
    return 'dev_fallback_secret_xiangyang_2024';
  }
  console.error('❌ FATAL: JWT_SECRET is not configured!');
  process.exit(1);
}

// JWT 配置
const JWT_OPTIONS: jwt.VerifyOptions = {
  algorithms: ['HS256'],
  clockTolerance: 30, // 允许 30s 时钟偏移
};

export function getAuthUserId(authorization?: string): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(authorization.slice(7), getJwtSecret(), JWT_OPTIONS) as { userId?: string };
    return payload.userId || null;
  } catch {
    return null;
  }
}

export function getAuthUser(authorization?: string): { userId: string; isAdmin: boolean } | null {
  const userId = getAuthUserId(authorization);
  if (!userId) return null;
  const user = getOne('SELECT is_admin FROM users WHERE id = ?', [userId]) as Record<string, any> | null;
  return { userId, isAdmin: Boolean(user?.is_admin) };
}

// 签发 Token
export function signToken(userId: string, isAdmin: boolean = false): string {
  const payload = { userId, isAdmin };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

// 验证 Token 并返回 payload
export function verifyToken(token: string): { userId: string; isAdmin: boolean } | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), JWT_OPTIONS) as { userId?: string; isAdmin?: boolean };
    if (!payload.userId) return null;
    return { userId: payload.userId, isAdmin: Boolean(payload.isAdmin) };
  } catch {
    return null;
  }
}

// Cookie 配置常量
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};
