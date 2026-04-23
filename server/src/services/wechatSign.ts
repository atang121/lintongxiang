import axios from 'axios';

// 微信 JS-SDK 签名生成
// 文档: https://developers.weixin.qq.com/doc/offiaccount/Js_bridge/Using_JS-SDK.html

let ticketCache: { ticket: string; expireAt: number } | null = null;

async function getJsApiTicket(): Promise<string> {
  // 缓存检查（有效期 7200s，提前 5 分钟刷新）
  if (ticketCache && Date.now() < ticketCache.expireAt - 5 * 60 * 1000) {
    return ticketCache.ticket;
  }

  const appId = process.env.WECHAT_APP_ID!;
  const appSecret = process.env.WECHAT_APP_SECRET!;

  // 获取 access_token
  const tokenRes = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
    params: { grant_type: 'client_credential', appid: appId, secret: appSecret },
  });
  const accessToken = tokenRes.data.access_token;
  if (!accessToken) throw new Error(`获取access_token失败: ${JSON.stringify(tokenRes.data)}`);

  // 获取 jsapi_ticket
  const ticketRes = await axios.get('https://api.weixin.qq.com/cgi-bin/get_jsapi_ticket', {
    params: { access_token: accessToken },
  });
  const ticket = ticketRes.data.ticket;
  if (!ticket) throw new Error(`获取jsapi_ticket失败: ${JSON.stringify(ticketRes.data)}`);

  ticketCache = { ticket, expireAt: Date.now() + 7200 * 1000 };
  return ticket;
}

export async function createSignature(pageUrl: string) {
  const appId = process.env.WECHAT_APP_ID!;
  const jsapiTicket = await getJsApiTicket();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const noncestr = Math.random().toString(36).slice(2, 10);

  // 签名算法：jsapi_ticket、timestamp、noncestr、url 按字典序拼接后 SHA1
  const str = `jsapi_ticket=${jsapiTicket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${pageUrl}`;
  const crypto = require('crypto');
  const signature = crypto.createHash('sha1').update(str).digest('hex');

  return {
    appId,
    timestamp,
    nonceStr: noncestr,
    signature,
    url: pageUrl,
  };
}
