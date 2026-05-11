'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { CATEGORY_LABELS, AGE_LABELS, EXCHANGE_MODE_LABELS, ItemCategory, AgeRange, ExchangeMode } from '@/types';
import { X, SlidersHorizontal } from 'lucide-react';

type SortOption = 'newest' | 'popular';

export default function FilterBar() {
  const { filters, setFilters, resetFilters } = useApp();
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  const sortOptions: { value: SortOption; label: string }[] = [
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
    filters.keyword !== '',
  ].filter(Boolean).length;

  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
  };

  // 搜索行为记录：关键词变化后 2 秒且非空时，记录到后端
  useEffect(() => {
    const kw = filters.keyword?.trim();
    if (!kw) return;

    const timer = setTimeout(() => {
      api.behavior.recordSearch({ keyword: kw }).catch(() => {});
    }, 2000);

    return () => clearTimeout(timer);
  }, [filters.keyword]);

  const clearAll = () => {
    resetFilters();
    setTempFilters({
      category: 'all',
      ageRange: 'all',
      exchangeMode: 'all',
      keyword: '',
      sortBy: 'newest',
      listingType: 'all',
    });
  };

  return (
    <>
      <div className="paper-surface rounded-[26px] px-4 py-3 sm:rounded-[30px] sm:py-4">
        <div className="mb-2 flex items-center justify-between gap-3 sm:mb-3">
          <p className="truncate text-[11px] leading-5 text-[#9a9288] sm:text-xs">
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
        <div className="mb-2 flex gap-2 sm:mb-3">
          {listingTypeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilters({ listingType: opt.value })}
              onPointerDown={() => {}}
              className={`rounded-full px-3 py-2 text-[13px] font-semibold transition-all active:scale-95 sm:px-4 sm:text-sm ${
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

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索玩具、绘本、童车..."
              value={filters.keyword}
              onChange={(e) => setFilters({ keyword: e.target.value })}
              className="soft-input w-full rounded-full py-2.5 pl-9 pr-10 text-sm text-[#56626b] sm:py-3"
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

          <div className="flex items-center gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ sortBy: e.target.value as SortOption })}
              className="secondary-button rounded-full px-4 py-2.5 text-xs font-semibold text-[#6f7a84] focus:outline-none sm:py-3"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setTempFilters(filters);
                setShowFilters(true);
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

          <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 sm:mt-3">
          {[
            { key: 'category', label: filters.category === 'all' ? '全部分类' : CATEGORY_LABELS[filters.category as ItemCategory] },
            { key: 'ageRange', label: filters.ageRange === 'all' ? '全部年龄' : AGE_LABELS[filters.ageRange as AgeRange] },
            { key: 'exchangeMode', label: filters.exchangeMode === 'all' ? '全部方式' : EXCHANGE_MODE_LABELS[filters.exchangeMode as ExchangeMode] },
          ].map((tag) => (
            <button
              key={tag.key}
              onClick={() => {
                setTempFilters(filters);
                setShowFilters(true);
              }}
              className="whitespace-nowrap rounded-full border border-[rgba(201,189,171,0.42)] bg-white/84 px-3 py-1.5 text-xs text-[#7f8890] transition-colors active:bg-[#f8f2e7] sm:py-2"
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
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

            <div className="mb-5">
              <h3 className="mb-2.5 text-sm font-semibold text-[#66727b]">📦 物品分类</h3>
              <div className="flex flex-wrap gap-2">
                {[['all', '不限'], ...categories].map(([key, label]) => (
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

            <div className="mb-5">
              <h3 className="mb-2.5 text-sm font-semibold text-[#66727b]">👶 适用年龄</h3>
              <div className="flex flex-wrap gap-2">
                {[['all', '不限'], ...ages].map(([key, label]) => (
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

            <div className="mb-6">
              <h3 className="mb-2.5 text-sm font-semibold text-[#66727b]">🤝 交换方式</h3>
              <div className="flex gap-2">
                {[['all', '不限'], ...modes].map(([key, label]) => (
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
