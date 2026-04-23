import jwt from 'jsonwebtoken';
import { getOne } from '../models/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

export function getAuthUserId(authorization?: string): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(authorization.slice(7), JWT_SECRET) as { userId?: string };
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
