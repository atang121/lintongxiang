import { Router } from 'express';
import { run, query, uuid } from '../models/db';
import { getAuthUserId } from '../lib/session';

export const behaviorRouter = Router();

// POST /api/behavior/view - 记录物品浏览
behaviorRouter.post('/view', (req, res) => {
  const { item_id, category, age_range } = req.body;
  if (!item_id) {
    return res.status(400).json({ error: 'item_id 必填' });
  }

  const userId = getAuthUserId(req.headers.authorization) || '';
  const id = 'vl_' + uuid().slice(0, 10);

  run(
    `INSERT INTO view_logs (id, user_id, item_id, category, age_range) VALUES (?, ?, ?, ?, ?)`,
    [id, userId, String(item_id), String(category || ''), String(age_range || '')]
  );

  // 限制每个用户最多保留 500 条浏览记录（滚动清理）
  if (userId) {
    const count = query('SELECT COUNT(*) as cnt FROM view_logs WHERE user_id = ?', [userId]);
    const cnt = Number((count[0] as any)?.cnt || 0);
    if (cnt > 500) {
      run(
        `DELETE FROM view_logs WHERE user_id = ? AND id IN (
          SELECT id FROM view_logs WHERE user_id = ? ORDER BY created_at ASC LIMIT ?
        )`,
        [userId, userId, cnt - 500]
      );
    }
  }

  res.json({ data: { ok: true } });
});

// POST /api/behavior/search - 记录搜索关键词
behaviorRouter.post('/search', (req, res) => {
  const { keyword, result_count } = req.body;
  if (!keyword || !String(keyword).trim()) {
    return res.status(400).json({ error: 'keyword 必填' });
  }

  const userId = getAuthUserId(req.headers.authorization) || '';
  const id = 'sl_' + uuid().slice(0, 10);

  run(
    `INSERT INTO search_logs (id, user_id, keyword, result_count) VALUES (?, ?, ?, ?)`,
    [id, userId, String(keyword).trim().slice(0, 100), Number(result_count) || 0]
  );

  // 限制每个用户最多保留 200 条搜索记录
  if (userId) {
    const count = query('SELECT COUNT(*) as cnt FROM search_logs WHERE user_id = ?', [userId]);
    const cnt = Number((count[0] as any)?.cnt || 0);
    if (cnt > 200) {
      run(
        `DELETE FROM search_logs WHERE user_id = ? AND id IN (
          SELECT id FROM search_logs WHERE user_id = ? ORDER BY created_at ASC LIMIT ?
        )`,
        [userId, userId, cnt - 200]
      );
    }
  }

  res.json({ data: { ok: true } });
});
