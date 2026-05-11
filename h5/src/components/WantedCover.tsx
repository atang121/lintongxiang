'use client';

import { AGE_LABELS, CATEGORY_LABELS, getPriceNegotiableLabel, Item } from '@/types';

interface WantedCoverProps {
  item: Item;
  compact?: boolean;
}

function getCategoryIcon(category: Item['category']) {
  if (category === 'textbook' || category === 'book') return '📚';
  if (category === 'toy' || category === 'education') return '🧸';
  if (category === 'clothes') return '👕';
  if (category === 'stroller' || category === 'outdoor') return '🛴';
  if (category === 'feeding') return '🥣';
  if (category === 'furniture') return '🛏️';
  return '🧺';
}

function getBudgetLabel(item: Item) {
  if (item.exchangeMode === 'sell') {
    const priceNote = getPriceNegotiableLabel(item.priceNegotiable, item.listingType);
    return item.price ? `预算 ¥${item.price}${priceNote ? ` · ${priceNote}` : ''}` : '愿意购买';
  }
  if (item.exchangeMode === 'gift') return '希望获赠';
  return '希望交换';
}

export default function WantedCover({ item, compact = false }: WantedCoverProps) {
  const categoryLabel = CATEGORY_LABELS[item.category];
  const ageLabel = AGE_LABELS[item.ageRange];
  const budgetLabel = getBudgetLabel(item);
  const icon = getCategoryIcon(item.category);

  if (compact) {
    return (
      <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#dfeadf] bg-[#f3faf4] text-[#607168]">
        <span className="text-[22px] leading-none">{icon}</span>
        <span className="mt-0.5 text-[10px] font-bold leading-none">求购</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-[28px] border border-white/70 bg-[#f3faf4] text-[#51626b]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.95),rgba(255,255,255,0)_36%),linear-gradient(135deg,rgba(226,242,225,0.95),rgba(251,242,229,0.92)_52%,rgba(238,247,239,0.94))]" />
      <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full border border-white/70 bg-white/28" />
      <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full border border-white/60 bg-[#e9d6b8]/28" />

      <div className="relative z-10 flex h-full w-full flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-full bg-white/74 px-3 py-1.5 text-[11px] font-bold text-[#6d8b76] shadow-sm backdrop-blur-sm">
            🔍 求购需求
          </div>
          <div className="rounded-full bg-[#f3d8ad]/82 px-3 py-1.5 text-[11px] font-bold text-[#806743] shadow-sm backdrop-blur-sm">
            {budgetLabel}
          </div>
        </div>

        <div className="mx-auto flex flex-1 flex-col items-center justify-center px-3 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/68 text-[42px] shadow-[0_16px_32px_rgba(150,132,102,0.12)] sm:h-24 sm:w-24 sm:text-[48px]">
            {icon}
          </div>
          <p className="mt-4 line-clamp-2 max-w-[16rem] text-[18px] font-bold leading-snug text-[#4b5862] sm:text-[21px]">
            {item.title}
          </p>
          <p className="mt-2 line-clamp-1 text-[12px] font-medium text-[#7f8d83]">
            邻居正在找这类儿童物品
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-[#8a7a65]">
            {categoryLabel}
          </span>
          <span className="rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-[#6e8d7b]">
            适合 {ageLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
