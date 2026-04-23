// ===== 核心类型定义 =====

export type ExchangeMode = 'gift' | 'swap' | 'sell';
export type ListingType = 'offer' | 'wanted';
export type AgeRange = '0-3' | '3-6' | '6-12' | '12-18' | 'all';
export type ItemStatus = 'available' | 'pending' | 'completed' | 'deleted';
export type ItemCategory =
  | 'toy'
  | 'textbook'
  | 'book'
  | 'clothes'
  | 'stroller'
  | 'education'
  | 'furniture'
  | 'outdoor'
  | 'feeding'
  | 'other';

export interface Item {
  id: string;
  title: string;
  description: string;
  images: string[];
  listingType: ListingType;
  category: ItemCategory;
  ageRange: AgeRange;
  exchangeMode: ExchangeMode;
  price?: number; // 当 exchangeMode === 'sell' 时
  condition: '全新' | '几乎全新' | '轻微使用' | '正常使用';
  location: {
    community: string;
    district?: string;
    lat: number;
    lng: number;
  };
  distance?: number; // 计算后的距离(km)
  userId: string;
  status: ItemStatus;
  createdAt: string;
  views: number;
  tags?: string[];
  ownerName?: string;
  ownerAvatar?: string;
  ownerCommunity?: string;
  ownerCredit?: number;
  ownerCreditScore?: number; // 钳制到 0-5 范围
}

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  community: string;
  district?: string;
  email?: string;
  creditScore: number; // 1-5
  exchangeCount: number;
  badges: Badge[];
  isLiaison: boolean;
  isAdmin: boolean;
  nicknameEditsUsed: number;
  communityEditsUsed: number;
  bio?: string;
  phone?: string;
  lat?: number;
  lng?: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface CommunityOption {
  name: string;
  district: string;
  lat: number;
  lng: number;
  enabled?: boolean;
  sort?: number;
}

export interface OpsConfig {
  auth_mode: 'qq_email_code';
  require_publish_review: boolean;
  image_upload_provider: string;
  image_upload_max_count: number;
  image_upload_max_mb: number;
  announcement: string;
  support_contact: string;
  qq_mail_enabled: boolean;
}

export interface OpsSource {
  feishu_enabled: boolean;
  mail_provider: 'preview' | 'smtp';
  image_upload_provider: string;
  image_upload_ready: boolean;
}

export interface Message {
  id: string;
  itemId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  createdAt: string;
  read: boolean;
  fromNickname?: string;
  fromAvatar?: string;
  toNickname?: string;
  toAvatar?: string;
  itemTitle?: string;
  itemImages?: string[];
  partnerId?: string;
  unread?: number;
}

export interface Notification {
  id: string;
  type: 'message' | 'exchange' | 'system';
  title: string;
  content: string;
  createdAt: string;
  read: boolean;
  userId?: string;
  relatedItemId?: string;
}

export interface Exchange {
  id: string;
  itemId: string;
  requesterId: string;
  ownerId: string;
  status: 'pending' | 'completed';
  message?: string;
  createdAt: string;
}

export interface FilterState {
  distance: number; // km, 0 = 不限
  category: ItemCategory | 'all';
  ageRange: AgeRange | 'all';
  exchangeMode: ExchangeMode | 'all';
  keyword: string;
  sortBy: 'distance' | 'newest' | 'popular';
  listingType: 'offer' | 'wanted' | 'all'; // 闲置转让 vs 求购需求
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  toy: '玩具',
  textbook: '教材',
  book: '书籍（含配套读物）',
  clothes: '童装鞋帽',
  stroller: '推车出行',
  education: '益智早教',
  furniture: '婴儿大件',
  outdoor: '户外运动',
  feeding: '辅食喂养',
  other: '其他',
};

export const AGE_LABELS: Record<AgeRange, string> = {
  '0-3': '0-3岁',
  '3-6': '3-6岁',
  '6-12': '6-12岁',
  '12-18': '12-18岁',
  all: '不限年龄',
};

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  offer: '闲置转让',
  wanted: '求购需求',
};

export const EXCHANGE_MODE_LABELS: Record<ExchangeMode, string> = {
  gift: '赠送 / 获赠',
  swap: '交换',
  sell: '出售 / 求购',
};

export function getExchangeModeLabel(mode: ExchangeMode, listingType: ListingType, price?: number) {
  if (listingType === 'wanted') {
    if (mode === 'gift') return '希望获赠';
    if (mode === 'swap') return '希望交换';
    return price ? `愿意购买 · 预算 ¥${price}` : '愿意购买';
  }

  if (mode === 'gift') return '免费赠送';
  if (mode === 'swap') return '以物换物';
  return price ? `定价出售 · ¥${price}` : '定价出售';
}

export const CONDITION_LABELS = {
  '全新': { color: 'text-green-600 bg-green-50', dot: '🟢' },
  '几乎全新': { color: 'text-blue-600 bg-blue-50', dot: '🔵' },
  '轻微使用': { color: 'text-amber-600 bg-amber-50', dot: '🟡' },
  '正常使用': { color: 'text-gray-600 bg-gray-50', dot: '⚪' },
} as const;
