import { Router } from 'express';
import axios from 'axios';
import { createSignature } from '../services/wechatSign';
import { handleWeChatLogin } from '../services/wechatAuth';
import crypto from 'crypto';

export const wechatRouter = Router();

const WECHAT_TOKEN = process.env.WECHAT_TOKEN || 'xiangyang_kids_swap';

// ══════════════════════════════════════
//  微信 JS-SDK 签名接口
//  前端调用 GET /api/wechat/signature?url=https://xxx
// ══════════════════════════════════════
wechatRouter.get('/signature', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url 必填' });

  try {
    const signature = await createSignature(url as string);
    res.json({ data: signature });
  } catch (err: any) {
    console.error('微信签名失败:', err.message);
    res.status(500).json({ error: '签名服务异常', detail: err.message });
  }
});

// ══════════════════════════════════════
//  微信网页授权登录
//  前端跳转: GET /api/wechat/authorize
// ══════════════════════════════════════
wechatRouter.get('/authorize', (req, res) => {
  const redirectUri = process.env.SERVER_PUBLIC_URL
    ? `${process.env.SERVER_PUBLIC_URL}/api/wechat/callback`
    : `${req.protocol}://${req.get('host')}/api/wechat/callback`;

  const encoded = encodeURIComponent(redirectUri);
  const appId = process.env.WECHAT_APP_ID || '';

  // scope=snsapi_base（静默授权，仅获取 openid）
  const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${encoded}&response_type=code&scope=snsapi_base&state=${Date.now()}#wechat_redirect`;

  res.redirect(url);
});

// ══════════════════════════════════════
//  微信授权回调
// ══════════════════════════════════════
wechatRouter.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: '缺少授权 code' });
  }

  try {
    const result = await handleWeChatLogin(code as string);
    // 返回到前端（直接重定向带 token）
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/login?token=${result.token}&user=${encodeURIComponent(JSON.stringify(result.user))}`;
    res.redirect(redirectUrl);
  } catch (err: any) {
    console.error('微信登录失败:', err.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=wechat_auth_failed`);
  }
});

// ══════════════════════════════════════
//  微信消息验证（公众号后台配置用）
// ══════════════════════════════════════
wechatRouter.get('/verify', (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;

  const arr = [WECHAT_TOKEN, timestamp as string, nonce as string].sort();
  const str = arr.join('');
  const sha1 = crypto.createHash('sha1').update(str).digest('hex');

  if (sha1 === signature) {
    res.send(echostr);
  } else {
    res.status(403).send('signature mismatch');
  }
});

// ══════════════════════════════════════
//  微信消息接收（POST）- 用于接收用户消息
//  注意：需要在微信公众号后台配置服务器地址
// ══════════════════════════════════════
wechatRouter.post('/receive', (req, res) => {
  // 被动回复消息（可扩展）
  const { ToUserName, FromUserName, MsgType, Content } = req.body || {};
  console.log(`收到微信消息: ${MsgType} - ${Content || ''}`);

  // 返回 success 表示已收到
  res.send('success');
});
