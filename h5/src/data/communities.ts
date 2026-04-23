export type CommunityOption = {
  name: string;
  district: string;
  lat: number;
  lng: number;
};

/** 襄阳市完整区县列表（顺序即选择器中展示顺序） */
export const XIANGYANG_DISTRICTS: { name: string; type: '市辖区' | '开发区' | '县级市' | '县' }[] = [
  { name: '襄城区', type: '市辖区' },
  { name: '樊城区', type: '市辖区' },
  { name: '襄州区', type: '市辖区' },
  { name: '高新区', type: '开发区' },
  { name: '东津新区', type: '开发区' },
  { name: '鱼梁洲开发区', type: '开发区' },
  { name: '老河口市', type: '县级市' },
  { name: '枣阳市', type: '县级市' },
  { name: '宜城市', type: '县级市' },
  { name: '南漳县', type: '县' },
  { name: '谷城县', type: '县' },
  { name: '保康县', type: '县' },
];

export const XIANGYANG_COMMUNITIES: CommunityOption[] = [
  { name: '民发・庞公别苑', district: '襄城区', lat: 32.0078, lng: 112.1264 },
  { name: '梧桐湾', district: '襄城区', lat: 32.0106, lng: 112.1321 },
  { name: '清华园', district: '襄城区', lat: 32.0049, lng: 112.1296 },
  { name: '在水一方', district: '襄城区', lat: 32.0123, lng: 112.1202 },
  { name: '北京公馆', district: '襄城区', lat: 32.0174, lng: 112.1366 },
  { name: '华凯・丽江泊林', district: '襄城区', lat: 32.0068, lng: 112.1408 },
  { name: '中房泰鑫花园', district: '襄城区', lat: 32.0231, lng: 112.1463 },
  { name: '庞公春晓', district: '襄城区', lat: 32.0019, lng: 112.1188 },
];

export function findNearestCommunity(lat: number, lng: number) {
  return XIANGYANG_COMMUNITIES
    .map((community) => ({
      ...community,
      distance:
        (community.lat - lat) * (community.lat - lat) +
        (community.lng - lng) * (community.lng - lng),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
}
