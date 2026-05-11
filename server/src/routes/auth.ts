import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getOne, run, query, uuid } from '../models/db';
import { sendLoginCode } from '../services/sms';
import { getJwtSecret, signToken, verifyToken, COOKIE_OPTIONS } from '../lib/session';
import { acceptServiceAgreement, getServiceAgreementVersion } from '../lib/compliance';
import { isConfiguredAdminPhone } from '../lib/adminPhones';
import {
  sendCodeLimiter,
  loginLimiter,
  verifyCodeLimiter,
  recordVerifyFailure,
  clearVerifyRecord,
  checkDailySmsLimit,
  recordSmsSend,
} from '../middleware/rateLimit';

export const authRouter = Router();

const BCRYPT_ROUNDS = 12; // bcrypt 成本因子
const PROFILE_SETUP_EXPIRES_IN = '10m';
const DEFAULT_COMMUNITY = '东门口';
const DEFAULT_DISTRICT = '襄城区';

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

function isValidPhone(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function normalizeUserPayload(user: Record<string, any>) {
  let childAgeRanges: string[] = [];
  try {
    childAgeRanges = JSON.parse(String(user.child_age_ranges || '[]'));
    if (!Array.isArray(childAgeRanges)) childAgeRanges = [];
  } catch {}

  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    community: user.community || DEFAULT_COMMUNITY,
    district: user.district || DEFAULT_DISTRICT,
    phone: user.phone || '',
    email: user.email || '',
    bio: user.bio || '',
    credit_score: user.credit_score,
    exchange_count: user.exchange_count,
    is_liaison: user.is_liaison,
    is_admin: Boolean(user.is_admin),
    badge: JSON.parse(String(user.badge || '[]')),
    child_age_ranges: childAgeRanges,
    child_count: user.child_count || 0,
    service_agreement_version: user.service_agreement_version || '',
    service_agreement_confirmed_at: user.service_agreement_confirmed_at || '',
    service_agreement_required: String(user.service_agreement_version || '') !== getServiceAgreementVersion(),
  };
}

function repairConfiguredAdminPhone(user: Record<string, any>) {
  if (!isConfiguredAdminPhone(String(user.phone || '')) || Boolean(user.is_admin)) {
    return user;
  }
  run('UPDATE users SET is_admin = 1 WHERE id = ?', [user.id]);
  return { ...user, is_admin: 1 };
}

// ============================================
// 手机号登录流程（新版 - 主要登录方式）
// ============================================

// POST /api/auth/send-code - 发送手机验证码
authRouter.post('/send-code', sendCodeLimiter, async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: '手机号必填' });
  }

  const normalizedPhone = String(phone).trim();
  if (!isValidPhone(normalizedPhone)) {
    return res.status(400).json({ error: '请输入有效的手机号' });
  }

  // 每日发送次数上限检查
  const dailyCheck = checkDailySmsLimit(normalizedPhone);
  if (!dailyCheck.allowed) {
    return res.status(429).json({ error: '今天登录过于频繁，请明天再试', daily_limit: true });
  }

  const code = createResetCode();

  // 存储验证码
  run(
    `INSERT INTO auth_codes (email, code, type, expires_at, created_at)
     VALUES (?, ?, 'login', ?, datetime('now'))
     ON CONFLICT(email, type) DO UPDATE SET
       code = excluded.code,
       expires_at = excluded.expires_at,
       created_at = excluded.created_at`,
    [normalizedPhone, code, createExpiresAt(5)]
  );

  // 发送短信验证码
  const result = await sendLoginCode(normalizedPhone, code);

  if (!result.success) {
    console.error('send login code failed:', result.error);
    return res.status(502).json({ error: result.error || '验证码发送失败，请稍后再试' });
  }

  // 记录发送次数
  recordSmsSend(normalizedPhone, req.ip || '');

  res.json({
    data: {
      phone: normalizedPhone,
      expires_in_seconds: 300,
      cooldown_seconds: 60,
      provider: result.provider,
      // 开发预览模式下直接返回验证码
      ...(process.env.NODE_ENV !== 'production' && result.preview_code ? { preview_code: result.preview_code } : {}),
    },
  });
});

// POST /api/auth/verify-code - 验证手机验证码
authRouter.post('/verify-code', verifyCodeLimiter, loginLimiter, (req, res) => {
  const { phone, code, service_agreement_accepted, service_agreement_source } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: '手机号和验证码必填' });
  }

  const normalizedPhone = String(phone).trim();
  if (!isValidPhone(normalizedPhone)) {
    return res.status(400).json({ error: '请输入有效的手机号' });
  }

  const codeRow = getOne(
    `SELECT * FROM auth_codes WHERE email = ? AND type = 'login'`,
    [normalizedPhone]
  ) as Record<string, any> | null;

  if (!codeRow || String(codeRow.code) !== String(code).trim()) {
    recordVerifyFailure(req);
    return res.status(400).json({ error: '验证码错误，请重新输入' });
  }

  if (isExpired(codeRow.expires_at ? String(codeRow.expires_at) : null)) {
    return res.status(400).json({ error: '验证码已过期，请重新获取' });
  }

  // 查找用户
  const user = getOne('SELECT * FROM users WHERE phone = ?', [normalizedPhone]) as Record<string, any> | null;
  if (!user) {
    clearVerifyRecord(req);
    run(`DELETE FROM auth_codes WHERE email = ? AND type = 'login'`, [normalizedPhone]);
    // 新用户，需要完善资料
    const profileToken = jwt.sign(
      { purpose: 'profile_setup', phone: normalizedPhone },
      getJwtSecret(),
      { expiresIn: PROFILE_SETUP_EXPIRES_IN } as jwt.SignOptions
    );
    return res.json({
      data: {
        need_profile_completion: true,
        temporary_token: profileToken,
        profile_draft: {
          phone: normalizedPhone,
          nickname: `用户${normalizedPhone.slice(-4)}`,
        },
      },
    });
  }

  // 老用户，签发 token 并设置 cookie
  let freshUser = getOne('SELECT * FROM users WHERE id = ?', [user.id]) as Record<string, any>;
  freshUser = repairConfiguredAdminPhone(freshUser);

  // 检查用户状态
  const userStatus = freshUser.status || 'active';
  if (userStatus === 'deactivated') {
    return res.status(403).json({ error: '该账号已被注销，如有疑问请联系管理员' });
  }

  if (String(freshUser.service_agreement_version || '') !== getServiceAgreementVersion()) {
    if (service_agreement_accepted !== true) {
      return res.status(428).json({
        error: '请先阅读并同意童邻市集用户服务文件',
        code: 'SERVICE_AGREEMENT_REQUIRED',
      });
    }
    acceptServiceAgreement(freshUser.id, String(service_agreement_source || 'login'));
    freshUser = getOne('SELECT * FROM users WHERE id = ?', [user.id]) as Record<string, any>;
  }

  clearVerifyRecord(req);
  run(`DELETE FROM auth_codes WHERE email = ? AND type = 'login'`, [normalizedPhone]);

  const token = signToken(freshUser.id, Boolean(freshUser.is_admin));

  res.cookie('token', token, COOKIE_OPTIONS);
  res.json({
    data: {
      need_profile_completion: false,
      token,
      user: normalizeUserPayload(freshUser),
    },
  });
});

// POST /api/auth/setup-profile - 新用户完善资料
authRouter.post('/setup-profile', (req, res) => {
  const {
    temporary_token,
    nickname,
    community,
    district,
    child_age_ranges,
    child_count,
    service_agreement_accepted,
    service_agreement_source,
  } = req.body;
  if (!temporary_token || !nickname) {
    return res.status(400).json({ error: '昵称和临时凭证必填' });
  }
  if (service_agreement_accepted !== true) {
    return res.status(400).json({ error: '请先阅读并同意童邻市集用户服务文件' });
  }
  const normalizedCommunity = String(community || '').trim().slice(0, 24);
  const normalizedDistrict = String(district || '附近小区').trim().slice(0, 24) || '附近小区';
  if (!normalizedCommunity) {
    return res.status(400).json({ error: '请选择或填写你所在的小区' });
  }

  // 验证 child_age_ranges 格式
  let normalizedAgeRanges: string[] = [];
  if (Array.isArray(child_age_ranges)) {
    const validRanges = ['0-3', '3-6', '6-12', '12-18'];
    normalizedAgeRanges = child_age_ranges.filter((r: string) => validRanges.includes(r));
  }

  // 验证 child_count 格式
  const normalizedChildCount = Math.max(0, Math.min(10, Number(child_count) || 0));

  try {
    const payload = jwt.verify(temporary_token, getJwtSecret()) as { purpose?: string; phone?: string };
    if (payload.purpose !== 'profile_setup' || !payload.phone) {
      return res.status(401).json({ error: '临时凭证无效' });
    }

    const normalizedPhone = String(payload.phone);
    const existing = getOne('SELECT * FROM users WHERE phone = ?', [normalizedPhone]) as Record<string, any> | null;
    if (existing) {
      // 意外情况：用户已存在，直接登录
      if (String(existing.service_agreement_version || '') !== getServiceAgreementVersion()) {
        acceptServiceAgreement(existing.id, String(service_agreement_source || 'registration'));
      }
      let freshExisting = getOne('SELECT * FROM users WHERE id = ?', [existing.id]) as Record<string, any>;
      freshExisting = repairConfiguredAdminPhone(freshExisting);
      const token = signToken(freshExisting.id, Boolean(freshExisting.is_admin));
      res.cookie('token', token, COOKIE_OPTIONS);
      return res.json({
        data: {
          token,
          user: normalizeUserPayload(freshExisting),
        },
      });
    }

    // 创建新用户
    const id = 'user_' + uuid().slice(0, 8);
    run(
      `INSERT INTO users (
         id, nickname, avatar, phone, community, district, child_age_ranges, child_count, is_admin,
         service_agreement_version, service_agreement_confirmed_at, service_agreement_source
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
      [id, String(nickname).trim(), '😊', normalizedPhone, normalizedCommunity, normalizedDistrict,
       JSON.stringify(normalizedAgeRanges), normalizedChildCount, isConfiguredAdminPhone(normalizedPhone) ? 1 : 0, getServiceAgreementVersion(),
       String(service_agreement_source || 'registration').slice(0, 32)]
    );

    const user = getOne('SELECT * FROM users WHERE id = ?', [id]) as Record<string, any> | null;
    if (!user) {
      return res.status(500).json({ error: '用户创建失败' });
    }

    const token = signToken(user.id, Boolean(user.is_admin));
    res.cookie('token', token, COOKIE_OPTIONS);
    return res.status(201).json({
      data: {
        token,
        user: normalizeUserPayload(user),
      },
    });
  } catch {
    return res.status(401).json({ error: '临时凭证无效或已过期' });
  }
});

// POST /api/auth/logout - 退出登录
authRouter.post('/logout', (req, res) => {
  res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
  res.json({ data: { ok: true } });
});

// POST /api/auth/accept-service-agreement - 账号级服务协议确认
authRouter.post('/accept-service-agreement', (req, res) => {
  let token = req.cookies?.token;
  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  if (!token) return res.status(401).json({ error: '请先登录' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'token 无效或已过期' });

  acceptServiceAgreement(payload.userId, String(req.body?.source || 'account'));
  const user = getOne('SELECT * FROM users WHERE id = ?', [payload.userId]) as Record<string, any> | null;
  if (!user) return res.status(404).json({ error: '用户不存在' });

  res.json({ data: normalizeUserPayload(user) });
});

// ============================================
// 旧版邮箱登录（已废弃 - 仅保留兼容）
// ============================================

// POST /api/auth/email-login - 邮箱密码登录（已废弃，请使用手机验证码登录）
authRouter.post('/email-login', loginLimiter, async (req, res) => {
  console.warn('⚠️ deprecated endpoint /api/auth/email-login called');
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码必填' });
  }

  const user = getOne('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase()]) as Record<string, any> | null;
  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  // 验证密码（兼容旧 SHA256 和新 bcrypt）
  let passwordValid = false;
  if (user.password_hash) {
    // 尝试 bcrypt
    if (user.password_hash.startsWith('$2')) {
      passwordValid = await bcrypt.compare(String(password), user.password_hash);
    } else {
      // 旧 SHA256 兼容（后续应迁移）
      const oldHash = require('crypto').createHash('sha256').update(String(password)).digest('hex');
      passwordValid = oldHash === user.password_hash;
    }
  }

  if (!passwordValid) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  // BUG-05: 检查用户状态
  const freshUser = getOne('SELECT * FROM users WHERE id = ?', [user.id]) as Record<string, any>;
  const userStatus = freshUser?.status || 'active';
  if (userStatus === 'muted') {
    return res.status(403).json({ error: '你的账号已被禁言，如有疑问请联系管理员' });
  }
  if (userStatus === 'deactivated') {
    return res.status(403).json({ error: '该账号已被注销' });
  }

  const token = signToken(freshUser.id, Boolean(freshUser.is_admin));
  res.cookie('token', token, COOKIE_OPTIONS);
  res.json({
    data: {
      token,
      user: normalizeUserPayload(freshUser),
    },
  });
});

// POST /api/auth/forgot-password - 忘记密码（已废弃）
authRouter.post('/forgot-password', sendCodeLimiter, (req, res) => {
  console.warn('⚠️ deprecated endpoint /api/auth/forgot-password called');
  res.status(410).json({ error: '该功能已废弃，请使用手机验证码登录' });
});

// POST /api/auth/reset-password - 重置密码（已废弃）
authRouter.post('/reset-password', (req, res) => {
  console.warn('⚠️ deprecated endpoint /api/auth/reset-password called');
  res.status(410).json({ error: '该功能已废弃，请使用手机验证码登录' });
});

// ============================================
// 快捷体验登录（仅开发环境）
// ============================================

// POST /api/auth/login - 快捷体验登录（仅 NODE_ENV!=='production'）
authRouter.post('/login', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: '生产环境禁用快捷登录' });
  }

  const { nickname } = req.body;
  if (!nickname) return res.status(400).json({ error: '昵称必填' });

  const id = 'user_' + uuid().slice(0, 8);
  run(
    `INSERT INTO users
       (id, nickname, community, district, avatar, service_agreement_version, service_agreement_confirmed_at, service_agreement_source)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
    [id, nickname, DEFAULT_COMMUNITY, DEFAULT_DISTRICT, '😊', getServiceAgreementVersion(), 'dev-login']
  );

  const user = getOne('SELECT * FROM users WHERE id = ?', [id]) as Record<string, any> | null;
  if (!user) return res.status(500).json({ error: '用户创建失败' });

  const token = signToken(user.id, Boolean(user.is_admin));
  res.cookie('token', token, COOKIE_OPTIONS);
  res.json({
    data: {
      token,
      user: normalizeUserPayload(user),
    },
  });
});

// ============================================
// 获取当前用户信息
// ============================================

// GET /api/auth/me - 获取当前登录用户
authRouter.get('/me', (req, res) => {
  // 优先从 cookie 获取 token
  let token = req.cookies?.token;
  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'token 无效或已过期' });
    }

    const user = getOne('SELECT * FROM users WHERE id = ?', [payload.userId]) as Record<string, any> | null;
    if (!user) return res.status(404).json({ error: '用户不存在' });

    res.json({ data: normalizeUserPayload(user) });
  } catch {
    res.status(401).json({ error: 'token 无效或已过期' });
  }
});
