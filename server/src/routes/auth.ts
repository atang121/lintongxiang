import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { getOne, run, uuid } from '../models/db';
import { getMailService } from '../services/mail';
import { createCommunitySubmissionInFeishu } from '../services/feishuBase';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const PROFILE_SETUP_EXPIRES_IN = '10m';

function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function signProfileSetupToken(email: string) {
  return jwt.sign({ purpose: 'profile_setup', email }, JWT_SECRET, {
    expiresIn: PROFILE_SETUP_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function createResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createExpiresAt(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now();
}

function isAdminEmail(email: string) {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  return adminEmail && email.toLowerCase() === adminEmail;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function normalizeUserPayload(user: Record<string, any>) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    community: user.community,
    district: user.district || '',
    phone: user.phone || '',
    email: user.email || '',
    bio: user.bio || '',
    credit_score: user.credit_score,
    exchange_count: user.exchange_count,
    is_liaison: user.is_liaison,
    is_admin: Boolean(user.is_admin),
    badge: JSON.parse(String(user.badge || '[]')),
  };
}

function syncAdminFlag(userId: string, email: string) {
  const shouldBeAdmin = isAdminEmail(email) ? 1 : 0;
  run('UPDATE users SET is_admin = ? WHERE id = ?', [shouldBeAdmin, userId]);
}

authRouter.post('/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: '邮箱必填' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: '请输入有效的邮箱地址' });
  }

  const code = createResetCode();
  run(
    `INSERT INTO auth_codes (email, code, type, expires_at, created_at)
     VALUES (?, ?, 'login', ?, datetime('now'))
     ON CONFLICT(email, type) DO UPDATE SET
       code = excluded.code,
       expires_at = excluded.expires_at,
       created_at = excluded.created_at`,
    [normalizedEmail, code, createExpiresAt(5)]
  );

  let delivery;
  try {
    delivery = await getMailService().sendLoginCode({
      email: normalizedEmail,
      code,
      expiresInMinutes: 5,
    });
  } catch (error) {
    console.error('send login code failed:', error);
    return res.status(502).json({ error: '验证码发送失败，请检查邮箱地址后重试' });
  }

  res.json({
    data: {
      email: normalizedEmail,
      expires_in_seconds: 300,
      cooldown_seconds: 60,
      delivery,
      ...(delivery.preview_code ? { preview_code: delivery.preview_code } : {}),
    },
  });
});

authRouter.post('/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: '邮箱和验证码必填' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const codeRow = getOne(
    `SELECT * FROM auth_codes WHERE email = ? AND type = 'login'`,
    [normalizedEmail]
  ) as Record<string, any> | null;

  if (!codeRow || String(codeRow.code) !== String(code).trim()) {
    return res.status(400).json({ error: '验证码错误，请重新输入' });
  }

  if (isExpired(codeRow.expires_at ? String(codeRow.expires_at) : null)) {
    return res.status(400).json({ error: '验证码已过期，请重新获取' });
  }

  run(`DELETE FROM auth_codes WHERE email = ? AND type = 'login'`, [normalizedEmail]);

  const user = getOne('SELECT * FROM users WHERE email = ?', [normalizedEmail]) as Record<string, any> | null;
  if (!user) {
    return res.json({
      data: {
        need_profile_completion: true,
        temporary_token: signProfileSetupToken(normalizedEmail),
        profile_draft: {
          email: normalizedEmail,
          nickname: normalizedEmail.split('@')[0],
        },
      },
    });
  }

  syncAdminFlag(user.id, normalizedEmail);
  const freshUser = getOne('SELECT * FROM users WHERE id = ?', [user.id]) as Record<string, any>;
  res.json({
    data: {
      need_profile_completion: false,
      token: signToken(user.id),
      user: normalizeUserPayload(freshUser),
    },
  });
});

authRouter.post('/setup-profile', (req, res) => {
  const { temporary_token, nickname, community, district, phone, isCustomCommunity } = req.body;
  if (!temporary_token || !nickname || !community) {
    return res.status(400).json({ error: '昵称、小区和临时凭证必填' });
  }

  try {
    const payload = jwt.verify(temporary_token, JWT_SECRET) as { purpose?: string; email?: string };
    if (payload.purpose !== 'profile_setup' || !payload.email) {
      return res.status(401).json({ error: '临时凭证无效' });
    }

    const normalizedEmail = String(payload.email).toLowerCase();
    const existing = getOne('SELECT * FROM users WHERE email = ?', [normalizedEmail]) as Record<string, any> | null;
    if (existing) {
      return res.json({
        data: {
          token: signToken(existing.id),
          user: normalizeUserPayload(existing),
        },
      });
    }

    const id = 'user_' + uuid().slice(0, 8);
    run(
      `INSERT INTO users (id, nickname, avatar, phone, community, district, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, String(nickname).trim(), '😊', phone || '', String(community).trim(), String(district || '').trim(), normalizedEmail]
    );

    const user = getOne('SELECT * FROM users WHERE id = ?', [id]) as Record<string, any> | null;
    if (!user) {
      return res.status(500).json({ error: '用户创建失败' });
    }

    // 自定义小区 → 异步写飞书审核表（不影响注册流程）
    if (isCustomCommunity) {
      createCommunitySubmissionInFeishu({
        userId: id,
        userNickname: nickname.trim(),
        communityName: community.trim(),
        district: district?.trim() || '',
      }).catch((err) => console.error('[Feishu] 提交小区补充申请失败:', err));
    }

    syncAdminFlag(user.id, normalizedEmail);
    const freshUser = getOne('SELECT * FROM users WHERE id = ?', [user.id]) as Record<string, any>;
    return res.status(201).json({
      data: {
        token: signToken(freshUser.id),
        user: normalizeUserPayload(freshUser),
      },
    });
  } catch {
    return res.status(401).json({ error: '临时凭证无效或已过期' });
  }
});

authRouter.post('/send-register-code', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: '邮箱必填' });
  }

  const normalizedEmail = String(email).toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: '请输入有效的邮箱地址' });
  }

  const existing = getOne('SELECT * FROM users WHERE email = ?', [normalizedEmail]) as Record<string, any> | null;
  if (existing) {
    return res.status(409).json({ error: '该邮箱已注册，请直接登录' });
  }

  const code = createResetCode();
  run(
    `INSERT INTO auth_codes (email, code, type, created_at)
     VALUES (?, ?, 'register', datetime('now'))
     ON CONFLICT(email, type) DO UPDATE SET code = excluded.code, created_at = excluded.created_at`,
    [normalizedEmail, code]
  );

  res.json({
    data: {
      email: normalizedEmail,
      code,
      hint: '请输入这组 6 位验证码完成注册。',
    },
  });
});

authRouter.post('/register', (req, res) => {
  const { email, password, nickname, community, district, phone, verification_code } = req.body;

  if (!email || !password || !verification_code) {
    return res.status(400).json({ error: '邮箱、验证码和密码必填' });
  }

  const normalizedEmail = String(email).toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: '请输入有效的邮箱地址' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' });
  }

  const existing = getOne('SELECT * FROM users WHERE email = ?', [normalizedEmail]) as Record<string, any> | null;
  if (existing) {
    return res.status(409).json({ error: '该邮箱已注册，请直接登录' });
  }

  const codeRow = getOne(
    `SELECT * FROM auth_codes WHERE email = ? AND type = 'register'`,
    [normalizedEmail]
  ) as Record<string, any> | null;
  if (!codeRow || String(codeRow.code) !== String(verification_code)) {
    return res.status(400).json({ error: '邮箱验证码不正确，请重新获取' });
  }

  const id = 'user_' + uuid().slice(0, 8);
  const finalNickname = nickname?.trim() || String(email).split('@')[0];
  run(
    `INSERT INTO users (id, nickname, avatar, phone, community, district, email, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, finalNickname, '😊', phone || '', community || '', district || '', normalizedEmail, hashPassword(String(password))]
  );
  run(`DELETE FROM auth_codes WHERE email = ? AND type = 'register'`, [normalizedEmail]);

  const user = getOne('SELECT * FROM users WHERE id = ?', [id]) as Record<string, any> | null;
  if (!user) return res.status(500).json({ error: '用户创建失败' });

  res.status(201).json({
    data: {
      token: signToken(user.id),
      user: normalizeUserPayload(user),
    },
  });
});

authRouter.post('/email-login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码必填' });
  }

  const user = getOne('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase()]) as Record<string, any> | null;
  if (!user || user.password_hash !== hashPassword(String(password))) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  syncAdminFlag(user.id, String(email).toLowerCase());
  const freshUser = getOne('SELECT * FROM users WHERE id = ?', [user.id]) as Record<string, any>;
  res.json({
    data: {
      token: signToken(freshUser.id),
      user: normalizeUserPayload(freshUser),
    },
  });
});

authRouter.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '邮箱必填' });

  const user = getOne('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase()]) as Record<string, any> | null;
  if (!user) {
    return res.status(404).json({ error: '该邮箱尚未注册' });
  }

  const resetCode = createResetCode();
  run(
    'UPDATE users SET reset_code = ?, reset_code_created_at = datetime(\'now\') WHERE id = ?',
    [resetCode, user.id]
  );

  res.json({
    data: {
      email: user.email,
      reset_code: resetCode,
      demo_hint: '请输入验证码并设置新密码。',
    },
  });
});

authRouter.post('/reset-password', (req, res) => {
  const { email, reset_code, new_password } = req.body;
  if (!email || !reset_code || !new_password) {
    return res.status(400).json({ error: '邮箱、验证码、新密码必填' });
  }

  if (String(new_password).length < 6) {
    return res.status(400).json({ error: '新密码至少 6 位' });
  }

  const user = getOne('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase()]) as Record<string, any> | null;
  if (!user) {
    return res.status(404).json({ error: '该邮箱尚未注册' });
  }

  if (!user.reset_code || String(user.reset_code) !== String(reset_code)) {
    return res.status(400).json({ error: '验证码错误' });
  }

  run(
    'UPDATE users SET password_hash = ?, reset_code = NULL, reset_code_created_at = NULL WHERE id = ?',
    [hashPassword(String(new_password)), user.id]
  );

  res.json({ data: { reset: true } });
});

// 保留快捷体验登录，方便线下 demo 不注册直接试看
authRouter.post('/login', (req, res) => {
  const { nickname, community, district, lat, lng, phone } = req.body;
  if (!nickname) return res.status(400).json({ error: '昵称必填' });

  const id = 'user_' + uuid().slice(0, 8);
  run(
    `INSERT INTO users (id, nickname, community, district, lat, lng, phone, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, nickname, community || '', district || '', lat || null, lng || null, phone || '', '😊']
  );

  const user = getOne('SELECT * FROM users WHERE id = ?', [id]) as Record<string, any> | null;
  if (!user) return res.status(500).json({ error: '用户创建失败' });

  res.json({
    data: {
      token: signToken(user.id),
      user: normalizeUserPayload(user),
    },
  });
});

authRouter.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });

  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
    const user = getOne('SELECT * FROM users WHERE id = ?', [payload.userId]) as Record<string, any> | null;
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ data: normalizeUserPayload(user) });
  } catch {
    res.status(401).json({ error: 'token 无效或已过期' });
  }
});
