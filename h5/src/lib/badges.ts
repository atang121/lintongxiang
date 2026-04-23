import { Badge } from '@/types';

export interface BadgeWithCondition extends Badge {
  condition: string;
}

export const BADGE_LIBRARY: BadgeWithCondition[] = [
  // 入门级
  { id: 'b1', name: '初次流转', icon: '🌱', color: 'text-green-600',   condition: '完成第一次物品交换' },
  { id: 'b2', name: '靠谱邻里', icon: '👍', color: 'text-blue-600',    condition: '收到邻居的好评回复' },

  // 品类徽章
  { id: 'b3', name: '绘本传递者', icon: '📚', color: 'text-amber-600', condition: '发布过绘本图书类物品' },
  { id: 'b4', name: '玩具达人',   icon: '🧸', color: 'text-pink-500',  condition: '累计发布 3 件玩具' },
  { id: 'b5', name: '童车守护者', icon: '🛴', color: 'text-sky-500',   condition: '发布过推车/童车类物品' },

  // 交换方式徽章
  { id: 'b6', name: '慷慨布施', icon: '🎁', color: 'text-rose-500',    condition: '完成一次免费赠送' },
  { id: 'b7', name: '以物换物', icon: '🔄', color: 'text-violet-500',  condition: '完成一次以物换物交换' },

  // 成就级
  { id: 'b8', name: '循环达人', icon: '♻️', color: 'text-emerald-600', condition: '累计完成 5 次流转' },
  { id: 'b9', name: '爱心家庭', icon: '❤️', color: 'text-red-500',     condition: '累计完成 10 次流转' },
  { id: 'b10', name: '童邻大使', icon: '🌟', color: 'text-yellow-500', condition: '平台认证的社区推广者' },
];
