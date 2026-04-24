'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CATEGORY_LABELS, AGE_LABELS, EXCHANGE_MODE_LABELS, ItemCategory, AgeRange, ExchangeMode } from '@/types';
import { X, SlidersHorizontal, ChevronDown } from 'lucide-react';

type SortOption = 'distance' | 'newest' | 'popular';
// 哪个快捷标签被激活（打开单项 Picker）
type ActiveTag = 'distance' | 'category' | 'ageRange' | 'exchangeMode' | null;

export default function FilterBar() {
  const { filters, setFilters, resetFilters } = useApp();
  // 完整筛选面板（「≡ 筛选」按钮打开）
  const [showFullPanel, setShowFullPanel] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);
  // 单项快速选择器
  const [activeTag, setActiveTag] = useState<ActiveTag>(null);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'distance', label: '距离最近' },
    { value: 'newest', label: '最新发布' },
    { value: 'popular', label: '最热' },
  ];

  const categories = Object.entries(CATEGORY_LABELS) as [ItemCategory, string][];
  const ages = Object.entries(AGE_LABELS) as [AgeRange, string][];
  const modes = Object.entries(EXCHANGE_MODE_LABELS) as [ExchangeMode, string][];

  const listingTypeOptions = [
    { value: 'all' as const, label: '全部' },
    { value: 'offer' as const, label: '🎁 闲置' },
    { value: 'wanted' as const, label: '🔍 需求' },
  ];

  const activeFilterCount = [
    filters.category !== 'all',
    filters.ageRange !== 'all',
    filters.exchangeMode !== 'all',
    filters.distance !== 3,
    filters.keyword !== '',
  ].filter(Boolean).length;

  // ── 完整面板操作 ──
  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFullPanel(false);
  };

  const clearAll = () => {
    resetFilters();
    setTempFilters({
      distance: 3,
      category: 'all',
      ageRange: 'all',
      exchangeMode: 'all',
      keyword: '',
      sortBy: 'distance',
      listingType: 'all',
    });
  };

  // ── 单项 Picker 操作 ──
  const openTag = (tag: ActiveTag) => {
    setActiveTag(tag);
  };
  const closeTag = () => setActiveTag(null);

  // 单项立即生效（无需点确认）
  const pickDistance = (d: number) => {
    setFilters({ distance: d });
    closeTag();
  };
  const pickCategory = (val: ItemCategory | 'all') => {
    setFilters({ category: val });
    closeTag();
  };
  const pickAge = (val: AgeRange | 'all') => {
    setFilters({ ageRange: val });
    closeTag();
  };
  const pickMode = (val: ExchangeMode | 'all') => {
    setFilters({ exchangeMode: val });
    closeTag();
  };

  // 每个标签是否已选中了非默认值
  const tagActive = {
    distance: filters.distance !== 3,
    category: filters.category !== 'all',
    ageRange: filters.ageRange !== 'all',
    exchangeMode: filters.exchangeMode !== 'all',
  };

  const tagLabel = {
    distance: `周边 ${filters.distance}km`,
    category: filters.category === 'all' ? '全部分类' : CATEGORY_LABELS[filters.category as ItemCategory],
    ageRange: filters.ageRange === 'all' ? '全部年龄' : AGE_LABELS[filters.ageRange as AgeRange],
    exchangeMode: filters.exchangeMode === 'all' ? '全部方式' : EXCHANGE_MODE_LABELS[filters.exchangeMode as ExchangeMode],
  };

  // ── Chip 公共样式 ──
  const chipBase = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-all active:scale-95';
  const chipNormal = 'border border-[rgba(201,189,171,0.42)] bg-white/84 text-[#7f8890]';
  const chipActive = 'border border-[#9cbba8] bg-[#eef6f0] text-[#4a7a62] font-semibold';

  return (
    <>
      <div className="paper-surface rounded-[30px] px-4 py-4">
        {/* 顶部提示 + 清除筛选 */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-[#9a9288]">
            🌿 每一件流转的物品，都是送给另一个孩子的礼物
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="shrink-0 text-xs font-semibold text-[#7a9486]"
            >
              清除筛选
            </button>
          )}
        </div>

        {/* 闲置 / 需求 切换 */}
        <div className="mb-3 flex gap-2">
          {listingTypeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { console.log('[FilterBar] setFilters listingType:', opt.value); setFilters({ listingType: opt.value }); }}
              onPointerDown={() => {}}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
                filters.listingType === opt.value
                  ? opt.value === 'wanted'
                    ? 'bg-[#7a3f10] text-white shadow-sm'
                    : 'bg-[#1f3a30] text-white shadow-sm'
                  : 'border border-[rgba(201,189,171,0.42)] bg-white/70 text-[#7f8890] hover:bg-[#f8f2e7]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索玩具、绘本、童车..."
              value={filters.keyword}
              onChange={(e) => setFilters({ keyword: e.target.value })}
              className="soft-input w-full rounded-full py-3 pl-9 pr-10 text-sm text-[#56626b]"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#97a0a8]">🔍</span>
            {filters.keyword && (
              <button
                onClick={() => setFilters({ keyword: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#97a0a8]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 排序下拉 + 完整筛选按钮 */}
          <div className="flex items-center gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ sortBy: e.target.value as SortOption })}
              className="secondary-button rounded-full px-4 py-3 text-xs font-semibold text-[#6f7a84] focus:outline-none"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* ≡ 筛选 → 打开完整面板 */}
            <button
              onClick={() => {
                setTempFilters(filters);
                setShowFullPanel(true);
              }}
              className={`relative inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                activeFilterCount > 0
                  ? 'bg-[#eef6f0] text-[#7a9486]'
                  : 'secondary-button text-[#6f7a84]'
              }`}
            >
              <SlidersHorizontal size={16} />
              筛选
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#9cbba8] px-1 text-[10px] font-bold leading-none text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 4 个快捷标签 —— 各自打开单项 Picker */}
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {(
            [
              { key: 'distance' as ActiveTag,     label: tagLabel.distance,     isActive: tagActive.distance },
              { key: 'category' as ActiveTag,     label: tagLabel.category,     isActive: tagActive.category },
              { key: 'ageRange' as ActiveTag,     label: tagLabel.ageRange,     isActive: tagActive.ageRange },
              { key: 'exchangeMode' as ActiveTag, label: tagLabel.exchangeMode, isActive: tagActive.exchangeMode },
            ] as { key: ActiveTag; label: string; isActive: boolean }[]
          ).map((tag) => (
            <button
              key={tag.key!}
              onPointerDown={() => {}}
              onClick={() => openTag(tag.key)}
              className={`${chipBase} ${tag.isActive ? chipActive : chipNormal}`}
            >
              {tag.label}
              <ChevronDown size={12} className={`transition-transform ${activeTag === tag.key ? 'rotate-180' : ''}`} />
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          单项快速 Picker（底部小抽屉）
      ════════════════════════════════════════════ */}
      {activeTag !== null && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeTag} />
          <div
            className="relative rounded-t-3xl bg-[#fffdf8] p-5"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
          >
            {/* 标题行 */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#56626b]">
                {activeTag === 'distance'     && '📍 距离范围'}
                {activeTag === 'category'     && '📦 物品分类'}
                {activeTag === 'ageRange'     && '👶 适用年龄'}
                {activeTag === 'exchangeMode' && '🤝 交换方式'}
              </h3>
              <button onClick={closeTag} className="text-[#aaa]">
                <X size={18} />
              </button>
            </div>

            {/* 距离 */}
            {activeTag === 'distance' && (
              <div className="flex gap-3">
                {[3, 5].map((d) => (
                  <button
                    key={d}
                    onPointerDown={() => {}}
                    onClick={() => pickDistance(d)}
                    className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-all active:scale-95 ${
                      filters.distance === d
                        ? 'bg-[#1f3a30] text-white shadow-sm'
                        : 'bg-[#f2ede5] text-[#7c858d]'
                    }`}
                  >
                    {d}km 以内
                  </button>
                ))}
              </div>
            )}

            {/* 分类 */}
            {activeTag === 'category' && (
              <div className="flex flex-wrap gap-2">
                {([['all', '不限'], ...categories] as [string, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onPointerDown={() => {}}
                    onClick={() => pickCategory(key as ItemCategory | 'all')}
                    className={`rounded-full px-4 py-2 text-sm transition-all active:scale-95 ${
                      filters.category === key
                        ? 'bg-[#1f3a30] font-semibold text-white shadow-sm'
                        : 'bg-[#f2ede5] text-[#7c858d]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* 年龄 */}
            {activeTag === 'ageRange' && (
              <div className="flex flex-wrap gap-2">
                {([['all', '不限'], ...ages] as [string, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onPointerDown={() => {}}
                    onClick={() => pickAge(key as AgeRange | 'all')}
                    className={`rounded-full px-4 py-2 text-sm transition-all active:scale-95 ${
                      filters.ageRange === key
                        ? 'bg-[#1f3a30] font-semibold text-white shadow-sm'
                        : 'bg-[#f2ede5] text-[#7c858d]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* 交换方式 */}
            {activeTag === 'exchangeMode' && (
              <div className="flex flex-wrap gap-2">
                {([['all', '不限'], ...modes] as [string, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onPointerDown={() => {}}
                    onClick={() => pickMode(key as ExchangeMode | 'all')}
                    className={`rounded-full px-4 py-2 text-sm transition-all active:scale-95 ${
                      filters.exchangeMode === key
                        ? 'bg-[#1f3a30] font-semibold text-white shadow-sm'
                        : 'bg-[#f2ede5] text-[#7c858d]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          完整筛选面板（「≡ 筛选」打开）
      ════════════════════════════════════════════ */}
      {showFullPanel && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFullPanel(false)} />
          <div
            className="relative max-h-[80vh] overflow-y-auto rounded-t-3xl bg-[#fffdf8] p-5"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#56626b]">筛选条件</h2>
              <button onClick={clearAll} className="text-sm font-medium text-[#7a9486]">
                清除全部
              </button>
            </div>

            {/* 距离 */}
            <div className="mb-5">
              <h3 className="mb-2.5 text-sm font-semibold text-[#66727b]">📍 距离范围</h3>
              <div className="flex gap-2">
                {[3, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => setTempFilters((prev) => ({ ...prev, distance: d }))}
                    className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                      tempFilters.distance === d
                        ? 'bg-[#9cbba8] font-medium text-white'
                        : 'bg-[#f8f2e8] text-[#7c858d]'
                    }`}
                  >
                    {d}km 以内
                  </button>
                ))}
              </div>
            </div>

            {/* 分类 */}
            <div className="mb-5">
              <h3 className="mb-2.5 text-sm font-semibold text-[#66727b]">📦 物品分类</h3>
              <div className="flex flex-wrap gap-2">
                {([['all', '不限'], ...categories] as [string, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTempFilters((prev) => ({ ...prev, category: key as ItemCategory | 'all' }))}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      tempFilters.category === key
                        ? 'bg-[#9cbba8] font-medium text-white'
                        : 'bg-[#f8f2e8] text-[#7c858d]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 年龄 */}
            <div className="mb-5">
              <h3 className="mb-2.5 text-sm font-semibold text-[#66727b]">👶 适用年龄</h3>
              <div className="flex flex-wrap gap-2">
                {([['all', '不限'], ...ages] as [string, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTempFilters((prev) => ({ ...prev, ageRange: key as AgeRange | 'all' }))}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      tempFilters.ageRange === key
                        ? 'bg-[#9cbba8] font-medium text-white'
                        : 'bg-[#f8f2e8] text-[#7c858d]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 交换方式 */}
            <div className="mb-6">
              <h3 className="mb-2.5 text-sm font-semibold text-[#66727b]">🤝 交换方式</h3>
              <div className="flex gap-2 flex-wrap">
                {([['all', '不限'], ...modes] as [string, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTempFilters((prev) => ({ ...prev, exchangeMode: key as ExchangeMode | 'all' }))}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      tempFilters.exchangeMode === key
                        ? 'bg-[#9cbba8] font-medium text-white'
                        : 'bg-[#f8f2e8] text-[#7c858d]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={applyFilters}
              className="primary-button w-full rounded-2xl py-3.5 text-base font-bold transition-colors"
            >
              确认筛选 ({[tempFilters.category !== 'all', tempFilters.ageRange !== 'all', tempFilters.exchangeMode !== 'all'].filter(Boolean).length > 0 ? '有筛选' : '查看全部'})
            </button>
          </div>
        </div>
      )}
    </>
  );
}
