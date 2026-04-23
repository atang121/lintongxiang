import { Router } from 'express';

import { getAuthUserId } from '../lib/session';
import { StorageConfigError, uploadImage } from '../services/storage';

export const uploadsRouter = Router();

function getRequestOrigin(req: { headers: Record<string, string | string[] | undefined> }) {
  const originHeader = req.headers.origin;
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = typeof forwardedHost === 'string'
    ? forwardedHost
    : typeof req.headers.host === 'string'
    ? req.headers.host
    : typeof originHeader === 'string' && originHeader
    ? new URL(originHeader).host
    : '';
  const proto = typeof forwardedProto === 'string'
    ? forwardedProto
    : typeof originHeader === 'string' && originHeader
    ? new URL(originHeader).protocol.replace(':', '')
    : 'http';

  return host ? `${proto}://${host}` : undefined;
}

uploadsRouter.post('/images', async (req, res) => {
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录后再上传图片' });
  }

  const { data_url, file_name, category } = req.body;
  if (!data_url) {
    return res.status(400).json({ error: '缺少图片内容' });
  }

  try {
    const uploaded = await uploadImage({
      dataUrl: String(data_url),
      fileName: file_name ? String(file_name) : undefined,
      category: category ? String(category) : 'items',
      ownerId: authUserId,
      requestOrigin: getRequestOrigin(req as never),
    });

    return res.status(201).json({ data: uploaded });
  } catch (error) {
    const status = error instanceof StorageConfigError ? 503 : 400;
    return res.status(status).json({
      error: error instanceof Error ? error.message : '图片上传失败',
    });
  }
});
