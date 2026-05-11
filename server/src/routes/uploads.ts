import { Router } from 'express';

import { getAuthUserId } from '../lib/session';
import { StorageConfigError, uploadImage } from '../services/storage';
import { uploadLimiter } from '../middleware/rateLimit';

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

uploadsRouter.post('/images', uploadLimiter, async (req, res) => {
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录后再上传图片' });
  }

  const { data_url, file_name, category } = req.body;
  if (!data_url) {
    return res.status(400).json({ error: '缺少图片内容' });
  }

  // BUG-22: 检查 base64 数据大小（限制 10MB）
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const base64Length = String(data_url).length - (String(data_url).indexOf(',') + 1);
  if (base64Length > MAX_FILE_SIZE * 1.37) { // base64 编码后约增大 37%
    return res.status(400).json({ error: '图片大小不能超过10MB' });
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

// BUG-22: 批量上传图片接口，限制最多 9 张，每张 10MB
uploadsRouter.post('/images/batch', uploadLimiter, async (req, res) => {
  const authUserId = getAuthUserId(req.headers.authorization);
  if (!authUserId) {
    return res.status(401).json({ error: '请先登录后再上传图片' });
  }

  const { images, category } = req.body;
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: '缺少图片内容' });
  }

  // 限制最多 9 张图片
  const MAX_IMAGES = 9;
  if (images.length > MAX_IMAGES) {
    return res.status(400).json({ error: `一次最多只能上传 ${MAX_IMAGES} 张图片` });
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const results = [];
  const errors = [];

  for (let i = 0; i < images.length; i++) {
    const { data_url, file_name } = images[i];
    if (!data_url) {
      errors.push({ index: i, error: '缺少图片内容' });
      continue;
    }

    // 检查每张图片大小
    const base64Length = String(data_url).length - (String(data_url).indexOf(',') + 1);
    if (base64Length > MAX_FILE_SIZE * 1.37) {
      errors.push({ index: i, error: '图片大小不能超过10MB' });
      continue;
    }

    try {
      const uploaded = await uploadImage({
        dataUrl: String(data_url),
        fileName: file_name ? String(file_name) : undefined,
        category: category ? String(category) : 'items',
        ownerId: authUserId,
        requestOrigin: getRequestOrigin(req as never),
      });
      results.push({ index: i, data: uploaded });
    } catch (error) {
      errors.push({
        index: i,
        error: error instanceof Error ? error.message : '图片上传失败',
      });
    }
  }

  return res.status(201).json({
    data: results.map(r => r.data),
    errors: errors.length > 0 ? errors : undefined,
    total: images.length,
    success: results.length,
    failed: errors.length,
  });
});
