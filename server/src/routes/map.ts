import { Router } from 'express';

export const mapRouter = Router();

/**
 * 逆地址解析：坐标 → 小区/社区名
 * GET /api/map/reverse-geocode?lat=32.0042&lng=112.1227
 */
mapRouter.get('/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;
  const key = process.env.TENCENT_MAP_KEY;

  if (!lat || !lng) {
    res.status(400).json({ error: '缺少 lat 或 lng 参数' });
    return;
  }

  if (!key) {
    res.status(500).json({ error: '未配置腾讯地图 Key' });
    return;
  }

  try {
    const url =
      `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}` +
      `&key=${key}&get_poi_address=1`;

    const response = await fetch(url);
    const json = await response.json() as { status: number; result?: any };

    if (json.status === 0) {
      const comp = json.result?.component || {};
      res.json({
        village: comp.village,
        community: comp.community,
        town: comp.town,
        district: comp.district,
        formatted_address: json.result?.formatted_addresses?.recommend,
      });
    } else {
      // 110=域名未授权 等错误，降级返回空
      res.json({ village: undefined, community: undefined, town: undefined, district: undefined });
    }
  } catch (err) {
    res.status(500).json({ error: '逆地址解析失败' });
  }
});
