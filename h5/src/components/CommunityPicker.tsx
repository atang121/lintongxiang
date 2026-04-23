'use client';

import { useState } from 'react';
import { ChevronLeft, Search } from 'lucide-react';

import { XIANGYANG_DISTRICTS } from '@/data/communities';
import { CommunityOption } from '@/types';

interface Props {
  value: string;
  districtValue?: string;
  onChange: (selection: { community: string; district: string; isCustom: boolean }) => void;
  communityOptions: CommunityOption[];
  /** 登录页需要显示审核提示 */
  showAuditHint?: boolean;
}

export function CommunityPicker({ value, districtValue = '', onChange, communityOptions, showAuditHint = false }: Props) {
  // 注册流程强制两步：district 为空时只显示区县选择，禁止跳过
  const [district, setDistrict] = useState<string>(() => districtValue || '');
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [search, setSearch] = useState('');

  const districtCommunities = communityOptions.filter((c) => c.district === district);
  const hasPresets = districtCommunities.length > 0;
  const searchResults = !customMode
    ? districtCommunities.filter((c) =>
        search.trim() === '' ? true : c.name.includes(search.trim())
      )
    : [];

  // 强制两步：每次选区县时重置小区选择
  const handleSelectDistrict = (d: string) => {
    setDistrict(d);
    setCustomMode(false);
    setCustomInput('');
    setSearch('');
  };

  const handleEnableCustom = () => {
    setCustomMode(true);
    setSearch('');
  };

  const handleBack = () => {
    setDistrict('');
    setCustomMode(false);
    setCustomInput('');
  };

  const handleSelectCommunity = (name: string) => {
    onChange({ community: name, district, isCustom: false });
  };

  const handleCustomConfirm = () => {
    const trimmed = customInput.trim();
    if (trimmed) onChange({ community: trimmed, district, isCustom: true });
  };

  if (!district) {
    return (
      <div>
        <p className="mb-2 text-xs text-[#8a7d68]">第一步：选择你所在的区县</p>
        <div className="grid grid-cols-3 gap-1.5">
          {XIANGYANG_DISTRICTS.map(({ name, type }) => (
            <button
              key={name}
              type="button"
              onClick={() => handleSelectDistrict(name)}
              onPointerDown={() => {}}
              className="rounded-2xl border border-[rgba(201,189,171,0.42)] bg-white px-2 py-2.5 text-center transition-colors hover:bg-[#eef6f0]"
            >
              <div className="text-sm font-semibold text-[#1c2d24]">{name}</div>
              <div className="mt-0.5 text-[10px] text-[#b0bab5]">{type}</div>
            </button>
          ))}
        </div>
        {value && (
          <p className="mt-2 text-xs text-[#8a938d]">当前：{value}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleBack}
        onPointerDown={() => {}}
        className="mb-2 flex items-center gap-1 text-xs text-[#6f7f76] hover:text-[#3d6b57]"
      >
        <ChevronLeft size={13} />
        {district}
      </button>

      {hasPresets && !customMode ? (
        <>
          {/* 搜索框 */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b8b3]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="输入小区名称，快速搜索..."
              className="soft-input w-full rounded-2xl pl-9 pr-4 py-2.5 text-sm"
              onPointerDown={() => {}}
            />
          </div>

          {search.trim() !== '' && searchResults.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#8a938d]">
              <div className="text-base mb-1">🔍</div>
              未找到包含「{search}」的小区
            </div>
          ) : search.trim() !== '' && searchResults.length > 0 ? (
            <div className="mb-2 text-xs text-[#8a938d]">
              找到 {searchResults.length} 个小区
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {(search.trim() === '' ? districtCommunities : searchResults).map((c) => {
              const active = value === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelectCommunity(c.name)}
                  onPointerDown={() => {}}
                  className={`relative rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-all active:opacity-70 ${
                    active
                      ? 'border-[#a8c3b1] bg-[#eef6f0] text-[#5f806f] shadow-sm'
                      : 'border-[rgba(201,189,171,0.42)] bg-white text-[#1c2d24] hover:border-[#a8c3b1]/60 hover:bg-[#f6faf7]'
                  }`}
                >
                  {c.name}
                  {active && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#5f806f] text-[9px] text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 space-y-2">
            <div className="rounded-2xl border border-dashed border-[#d7d2c7] bg-[#fbf8f3] px-3 py-2.5 text-xs leading-5 text-[#8a938d]">
              当前区县已有 {districtCommunities.length} 个预设小区，请优先从列表中选择。
            </div>
            <button
              type="button"
              onClick={handleEnableCustom}
              onPointerDown={() => {}}
              className="w-full rounded-2xl border border-[#c8dcd0] bg-[#f0f7f2] px-3 py-2.5 text-center text-sm font-medium text-[#5f806f] hover:bg-[#e6f2ec]"
            >
              如果列表中没有你的小区，点击这里手动补充
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-2 text-xs text-[#8a7d68]">
            {hasPresets ? '手动填写小区名称' : '暂无预设小区，请手动填写'}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={`例如：${district}某某花园`}
              className="soft-input flex-1 rounded-2xl px-4 py-2.5 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleCustomConfirm()}
            />
            <button
              type="button"
              onClick={handleCustomConfirm}
              onPointerDown={() => {}}
              disabled={!customInput.trim()}
              className="shrink-0 rounded-2xl bg-[#eef6f0] px-4 py-2.5 text-sm font-semibold text-[#7a9b86] disabled:opacity-40"
            >
              确认
            </button>
          </div>
          {hasPresets && (
            <button
              type="button"
              onClick={() => setCustomMode(false)}
              onPointerDown={() => {}}
              className="mt-2 flex items-center gap-1 text-xs text-[#8a938d] hover:text-[#5f806f]"
            >
              <ChevronLeft size={11} />
              返回列表选择
            </button>
          )}
        </>
      )}
    </div>
  );
}
