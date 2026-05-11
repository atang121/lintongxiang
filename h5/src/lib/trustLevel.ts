export type TrustLevelKey = 'new_neighbor' | 'has_exchanged' | 'reliable_neighbor' | 'warm_neighbor';

export interface TrustLevel {
  key: TrustLevelKey;
  label: '新邻居' | '有过交换' | '靠谱邻居' | '热心邻居';
  icon: string;
  tone: string;
  description: string;
}

export function getTrustLevel(exchangeCount: number): TrustLevel {
  const count = Math.max(0, Number.isFinite(exchangeCount) ? Math.floor(exchangeCount) : 0);

  if (count >= 6) {
    return {
      key: 'warm_neighbor',
      label: '热心邻居',
      icon: '🌟',
      tone: 'bg-amber-50 text-amber-700 border-amber-100',
      description: '多次完成交换，社区活跃度高',
    };
  }

  if (count >= 3) {
    return {
      key: 'reliable_neighbor',
      label: '靠谱邻居',
      icon: '👍',
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      description: '已完成多次交换，履约记录稳定',
    };
  }

  if (count >= 1) {
    return {
      key: 'has_exchanged',
      label: '有过交换',
      icon: '🤝',
      tone: 'bg-sky-50 text-sky-700 border-sky-100',
      description: '已经完成过一次邻里交换',
    };
  }

  return {
    key: 'new_neighbor',
    label: '新邻居',
    icon: '🌱',
    tone: 'bg-[#f3f7ed] text-[#607168] border-[#dfead2]',
    description: '刚加入童邻市集，等待第一次交换',
  };
}
