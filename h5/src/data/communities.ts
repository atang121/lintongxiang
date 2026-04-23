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
  // 襄城区
  { name: '民发・庞公别苑', district: '襄城区', lat: 32.0078, lng: 112.1264 },
  { name: '梧桐湾', district: '襄城区', lat: 32.0106, lng: 112.1321 },
  { name: '清华园', district: '襄城区', lat: 32.0049, lng: 112.1296 },
  { name: '在水一方', district: '襄城区', lat: 32.0123, lng: 112.1202 },
  { name: '北京公馆', district: '襄城区', lat: 32.0174, lng: 112.1366 },
  { name: '华凯・丽江泊林', district: '襄城区', lat: 32.0068, lng: 112.1408 },
  { name: '中房泰鑫花园', district: '襄城区', lat: 32.0231, lng: 112.1463 },
  { name: '庞公春晓', district: '襄城区', lat: 32.0019, lng: 112.1188 },
  { name: '东方丽晶', district: '襄城区', lat: 32.0192, lng: 112.1401 },
  { name: '盛融・颐景园', district: '襄城区', lat: 32.0055, lng: 112.1310 },
  { name: '骧龙国际', district: '襄城区', lat: 32.0156, lng: 112.1285 },
  { name: '冠通・上城', district: '襄城区', lat: 32.0205, lng: 112.1432 },
  { name: '春晓花园', district: '襄城区', lat: 32.0088, lng: 112.1165 },
  { name: '智创・理想城', district: '襄城区', lat: 32.0212, lng: 112.1356 },
  { name: '轴承厂小区', district: '襄城区', lat: 32.0165, lng: 112.1420 },
  { name: '万紫千红', district: '襄城区', lat: 32.0118, lng: 112.1238 },
  { name: '檀溪花园', district: '襄城区', lat: 32.0135, lng: 112.1180 },
  { name: '锦绣天城', district: '襄城区', lat: 32.0188, lng: 112.1302 },
  { name: '新吉户', district: '襄城区', lat: 32.0220, lng: 112.1395 },
  { name: '山水天成', district: '襄城区', lat: 32.0102, lng: 112.1145 },
  { name: '绿地・栖溪小镇', district: '襄城区', lat: 32.0168, lng: 112.1088 },
  { name: '君临山', district: '襄城区', lat: 32.0072, lng: 112.1210 },
  { name: '北苑小区', district: '襄城区', lat: 32.0195, lng: 112.1458 },
  { name: '老龙堤', district: '襄城区', lat: 32.0042, lng: 112.1255 },
  { name: '铁佛寺小区', district: '襄城区', lat: 32.0175, lng: 112.1505 },
  { name: '财苑小区', district: '襄城区', lat: 32.0158, lng: 112.1388 },
  { name: '西巷子', district: '襄城区', lat: 32.0128, lng: 112.1438 },
  { name: '南丽岛', district: '襄城区', lat: 32.0095, lng: 112.1178 },
  { name: '盛景怡园', district: '襄城区', lat: 32.0225, lng: 112.1285 },
  { name: '宏宇・学府', district: '襄城区', lat: 32.0138, lng: 112.1228 },

  // 樊城区
  { name: '万达广场', district: '樊城区', lat: 32.0288, lng: 112.1345 },
  { name: '绿地・中央公园', district: '樊城区', lat: 32.0342, lng: 112.1268 },
  { name: '民发・世纪金源', district: '樊城区', lat: 32.0295, lng: 112.1425 },
  { name: '新合作・食品新城', district: '樊城区', lat: 32.0368, lng: 112.1395 },
  { name: '好邻居・花园里', district: '樊城区', lat: 32.0312, lng: 112.1188 },
  { name: '金环・御江天城', district: '樊城区', lat: 32.0335, lng: 112.1455 },
  { name: '天元・四季城', district: '樊城区', lat: 32.0278, lng: 112.1512 },
  { name: '华域・龙门', district: '樊城区', lat: 32.0385, lng: 112.1295 },
  { name: '中航・工业新城', district: '樊城区', lat: 32.0358, lng: 112.1525 },
  { name: '现代城', district: '樊城区', lat: 32.0305, lng: 112.1375 },
  { name: '幸福里', district: '樊城区', lat: 32.0328, lng: 112.1248 },
  { name: '东方墨尔本', district: '樊城区', lat: 32.0362, lng: 112.1412 },
  { name: '银座・金典', district: '樊城区', lat: 32.0292, lng: 112.1558 },
  { name: '星火家属院', district: '樊城区', lat: 32.0345, lng: 112.1338 },
  { name: '长虹新城', district: '樊城区', lat: 32.0318, lng: 112.1485 },
  { name: '供电小区', district: '樊城区', lat: 32.0372, lng: 112.1268 },
  { name: '建昌小区', district: '樊城区', lat: 32.0285, lng: 112.1428 },
  { name: '汉江明珠', district: '樊城区', lat: 32.0338, lng: 112.1358 },
  { name: '融侨・城', district: '樊城区', lat: 32.0355, lng: 112.1438 },
  { name: '御江金街', district: '樊城区', lat: 32.0308, lng: 112.1565 },

  // 襄州区
  { name: '民发・星汇城', district: '襄州区', lat: 32.0085, lng: 112.2285 },
  { name: '九街区', district: '襄州区', lat: 32.0125, lng: 112.2158 },
  { name: '时代天街', district: '襄州区', lat: 32.0155, lng: 112.2355 },
  { name: '世纪星城', district: '襄州区', lat: 32.0188, lng: 112.2098 },
  { name: '阳光城', district: '襄州区', lat: 32.0212, lng: 112.2258 },
  { name: '铁路和谐家园', district: '襄州区', lat: 32.0058, lng: 112.2195 },
  { name: '园林小区', district: '襄州区', lat: 32.0105, lng: 112.2325 },
  { name: '金富士・龙都', district: '襄州区', lat: 32.0168, lng: 112.2088 },
  { name: '航空花园', district: '襄州区', lat: 32.0225, lng: 112.2185 },
  { name: '华侨城・天鹅堡', district: '襄州区', lat: 32.0195, lng: 112.2425 },

  // 高新区
  { name: '乐业城', district: '高新区', lat: 32.1085, lng: 112.1085 },
  { name: '创业园小区', district: '高新区', lat: 32.1125, lng: 112.0958 },
  { name: '学府花园', district: '高新区', lat: 32.1058, lng: 112.1185 },
  { name: '东风阳光城', district: '高新区', lat: 32.1155, lng: 112.1028 },
  { name: '神龙小区', district: '高新区', lat: 32.1188, lng: 112.0885 },
  { name: '连山湖社区', district: '高新区', lat: 32.1088, lng: 112.1258 },
  { name: '嘉实多花园', district: '高新区', lat: 32.1025, lng: 112.1128 },
  { name: '光彩工业园宿舍', district: '高新区', lat: 32.1128, lng: 112.0985 },
  { name: '米庄小区', district: '高新区', lat: 32.0985, lng: 112.1285 },
  { name: '刘集家园', district: '高新区', lat: 32.1055, lng: 112.1358 },

  // 东津新区
  { name: '华侨城・云栖湖', district: '东津新区', lat: 32.0825, lng: 112.0585 },
  { name: '东津世纪城', district: '东津新区', lat: 32.0885, lng: 112.0658 },
  { name: '华鼎・揽月湾', district: '东津新区', lat: 32.0855, lng: 112.0525 },
  { name: '新市民公寓', district: '东津新区', lat: 32.0925, lng: 112.0725 },
  { name: '高铁还建小区', district: '东津新区', lat: 32.0958, lng: 112.0485 },
  { name: '东津新城・芯城', district: '东津新区', lat: 32.0895, lng: 112.0625 },
  { name: '浩然居', district: '东津新区', lat: 32.0868, lng: 112.0755 },
  { name: '雅居乐・御宾府', district: '东津新区', lat: 32.0835, lng: 112.0568 },

  // 鱼梁洲开发区
  { name: '鱼梁洲绿洲花园', district: '鱼梁洲开发区', lat: 32.0325, lng: 112.0885 },
  { name: '金色家园', district: '鱼梁洲开发区', lat: 32.0355, lng: 112.0925 },
  { name: '阳光水岸', district: '鱼梁洲开发区', lat: 32.0385, lng: 112.0858 },
  { name: '星月湾', district: '鱼梁洲开发区', lat: 32.0315, lng: 112.0958 },
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
