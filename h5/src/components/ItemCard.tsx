'use client';

import Link from 'next/link';
import { AGE_LABELS, CATEGORY_LABELS, CONDITION_LABELS, getExchangeModeLabel, Item, LISTING_TYPE_LABELS } from '@/types';

// API 返回格式（包含 owner 字段）
interface ApiItem extends Item {
  owner_name?: string;
  owner_avatar?: string;
  owner_community?: string;
  owner_credit?: number;
}

interface ItemCardProps {
  item: Item;
  showDistance?: boolean;
}

export default function ItemCard({ item, showDistance = true }: ItemCardProps) {
  const apiItem = item as ApiItem;

  const modeBg: Record<string, string> = {
    gift: 'bg-[#a9ceb5]',
    swap: 'bg-[#b8c9df]',
    sell: 'bg-[#e6c8a2]',
  };

  const isPending = item.status === 'pending';
  const isWanted = item.listingType === 'wanted';
  const conditionInfo = CONDITION_LABELS[item.condition as keyof typeof CONDITION_LABELS];
  const modeLabel = getExchangeModeLabel(item.exchangeMode, item.listingType, item.price);

  return (
    <Link href={`/items/${item.id}`} className="block">
      <div className={`group overflow-hidden rounded-[30px] border bg-[rgba(255,253,249,0.96)] shadow-[0_14px_36px_rgba(180,159,136,0.08)] transition-all duration-200 active:scale-[0.985] lg:hover:-translate-y-1 lg:hover:shadow-[0_22px_46px_rgba(180,159,136,0.12)] ${isPending ? 'border-[#e8c97a]' : 'border-[rgba(201,189,171,0.42)]'}`}>
        <div className="relative aspect-[4/4.3] bg-[#f5ece0] sm:aspect-[4/4.6]">
          {item.images[0] ? (
            <img
              src={item.images[0]}
              alt={item.title}
              className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${isPending ? 'brightness-[0.88]' : ''}`}
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.img-fallback')) {
                  const fb = document.createElement('div');
                  fb.className = 'img-fallback absolute inset-0 flex flex-col items-center justify-center gap-1';
                  fb.innerHTML = '<span style="font-size:2.5rem">📦</span><span style="font-size:0.65rem;color:#a09080">暂无图片</span>';
                  parent.appendChild(fb);
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span className="text-4xl">📦</span>
              <span className="text-[10px] text-[#a09080]">暂无图片</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#5f6b75]/34 to-transparent" />
          <div
            className={`absolute left-3 top-3 ${modeBg[item.exchangeMode]} text-[#54606a] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm`}
          >
            {modeLabel}
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-white/78 px-2.5 py-1 text-[10px] font-semibold text-[#607168] backdrop-blur-sm">
            {LISTING_TYPE_LABELS[item.listingType]}
          </div>

          {isPending && (
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-[#7a5c1e]/80 to-transparent px-4 pb-3 pt-8">
              <span className="text-sm">🔒</span>
              <span className="text-xs font-semibold text-amber-100">{isWanted ? '已有邻居在回应需求' : '预约中 · 可排队留言'}</span>
            </div>
          )}

          {!isPending && item.exchangeMode === 'sell' && item.price && (
            <div className="absolute bottom-3 right-3 rounded-2xl bg-white/78 px-3 py-1.5 text-sm font-bold text-[#8f7b58] backdrop-blur-sm">
              {isWanted ? `预算 ¥${item.price}` : `¥${item.price}`}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug text-[#45515c] sm:text-[17px]">
              {item.title}
            </h3>
            {item.exchangeMode === 'sell' && item.price ? (
              <div className="shrink-0 rounded-full bg-[#fff3df] px-2.5 py-1 text-[12px] font-bold text-[#b18e63]">
                {isWanted ? `预算 ¥${item.price}` : `¥${item.price}`}
              </div>
            ) : null}
          </div>

          <p className="mb-3 line-clamp-2 text-[12px] leading-5 text-[#7b8590]">
            {item.description}
          </p>

          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#faf2e7] px-2.5 py-1 text-[11px] text-[#8a7a65]">
              {CATEGORY_LABELS[item.category]}
            </span>
            <span className="rounded-full bg-[#eef6f0] px-2.5 py-1 text-[11px] font-medium text-[#6e8d7b]">
              适合 {AGE_LABELS[item.ageRange]}
            </span>
            {conditionInfo && !isWanted && (
              <span className={`rounded-full px-2.5 py-1 text-[11px] ${conditionInfo.color}`}>
                {conditionInfo.dot} {item.condition}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7efe4] text-base shadow-inner">
                {apiItem.owner_avatar ?? '👤'}
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-[#5b6770]">{apiItem.owner_name || '邻居家长'}</div>
                <div className="truncate text-[11px] text-[#9b9487]">{item.location.community}</div>
              </div>
            </div>
            <div className="text-right">
              {showDistance && item.distance !== undefined && (
                <div className="text-[11px] font-semibold text-[#7f9fb8]">
                  {item.distance < 0.1 ? '<100m' : `${item.distance}km`}
                </div>
              )}
              <div className="mt-0.5 text-[11px] text-[#9b9487]">{item.views} 次浏览</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
