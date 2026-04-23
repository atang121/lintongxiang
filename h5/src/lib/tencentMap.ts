/**
 * 腾讯地图 SDK 封装
 * 提供地理定位、逆地址解析（坐标→小区名）、距离计算
 *
 * 使用方式：
 *   import { locationService } from '@/lib/tencentMap';
 *   const pos = await locationService.getCurrentPosition();
 *   const community = await locationService.reverseGeocode(pos.lat, pos.lng);
 */

import { resolveApiBaseUrl } from './env';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationResult {
  position: LatLng;
  community?: string;
  accuracy?: number;
}

// 襄阳默认中心
export const XIANGYANG_CENTER: LatLng = { lat: 32.0042, lng: 112.1227 };

// 距离计算（km）
export function calcDistanceKm(from: LatLng, to: LatLng): number {
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 格式化为可读距离
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

// ===== 定位服务 =====

export const locationService = {
  /**
   * 获取当前 GPS 位置
   * 优先使用浏览器原生 API，降级到襄阳默认坐标
   */
  getCurrentPosition(): Promise<LocationResult> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve({ position: XIANGYANG_CENTER });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const position: LatLng = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          // 尝试逆地址解析获取小区名
          let community: string | undefined;
          try {
            community = await reverseGeocode(position.lat, position.lng);
          } catch {
            // 降级时不报错
          }
          resolve({ position, community, accuracy: pos.coords.accuracy });
        },
        () => {
          // 定位失败用默认坐标
          resolve({ position: XIANGYANG_CENTER });
        },
        { timeout: 8000, maximumAge: 60000 }
      );
    });
  },

  /**
   * 监听位置变化（用于走路时自动刷新附近物品）
   */
  watchPosition(
    onUpdate: (result: LocationResult) => void,
    onError?: () => void
  ): () => void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      onError?.();
      return () => {};
    }
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const result: LocationResult = {
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
        };
        onUpdate(result);
      },
      () => onError?.(),
      { timeout: 8000, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  },
};

// ===== 逆地址解析（坐标 → 地址） =====

export async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const res = await fetch(
      `${resolveApiBaseUrl()}/map/reverse-geocode?lat=${lat}&lng=${lng}`
    );
    const json = await res.json();
    if (!res.ok) return undefined;
    return json.village || json.community || json.town || json.district || undefined;
  } catch {
    return undefined;
  }
}

// ===== 地点搜索（小区名 → 坐标） =====

export async function searchCommunity(
  keyword: string,
  region = '襄阳'
): Promise<Array<{ name: string; lat: number; lng: number; district: string }>> {
  // 小区搜索走腾讯地图 WebServiceAPI（从后端转发，无需白名单）
  const key = process.env.NEXT_PUBLIC_TENCENT_MAP_KEY;
  if (!key) return [];
  const url =
    `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(keyword)}` +
    `&region=${encodeURIComponent(region)}&key=${key}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 0) {
      return (json.data || []).map((p: { title: string; location: { lat: number; lng: number }; ad_info: { district: string } }) => ({
        name: p.title,
        lat: p.location.lat,
        lng: p.location.lng,
        district: p.ad_info?.district || region,
      }));
    }
  } catch {
    // 网络错误
  }
  return [];
}

// ===== 距离排序辅助 =====

export function sortByDistance<T extends { location: LatLng }>(
  items: T[],
  userPos: LatLng
): (T & { distance: number })[] {
  return items
    .map((item) => ({
      ...item,
      distance: calcDistanceKm(userPos, item.location),
    }))
    .sort((a, b) => a.distance - b.distance);
}
