import axios from 'axios';
import jwt from 'jsonwebtoken';
import { getOne, run, uuid } from '../models/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

export async function handleWeChatLogin(code: string) {
  const appId = process.env.WECHAT_APP_ID!;
  const appSecret = process.env.WECHAT_APP_SECRET!;

  const res = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
    params: { grant_type: 'authorization_code', appid: appId, secret: appSecret, code },
  });

  const { openid, access_token } = res.data;
  if (!openid) throw new Error(`换取openid失败: ${JSON.stringify(res.data)}`);

  let nickname = '微信用户';
  let avatar = '😊';

  try {
    const userInfoRes = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
      params: { access_token, openid },
    });
    nickname = userInfoRes.data.nickname || nickname;
    avatar = userInfoRes.data.headimgurl || avatar;
  } catch {
    console.log('静默授权，未获取到用户详细信息');
  }

  let user = getOne('SELECT * FROM users WHERE openid = ?', [openid]) as Record<string, any> | null;
  const isNew = !user;

  if (!user) {
    const id = 'user_' + uuid().slice(0, 8);
    run(`INSERT INTO users (id, nickname, avatar, openid) VALUES (?, ?, ?, ?)`,
      [id, nickname, avatar, openid]);
    user = getOne('SELECT * FROM users WHERE id = ?', [id]) as Record<string, any> | null;
  }

  if (!user) {
    throw new Error('微信用户创建失败');
  }

  const token = jwt.sign({ userId: user.id, openid }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });

  return {
    token,
    user: {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      community: user.community,
      credit_score: user.credit_score,
      badge: JSON.parse(String(user.badge || '[]')),
    },
    isNew,
  };
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: string; openid: string };
}
