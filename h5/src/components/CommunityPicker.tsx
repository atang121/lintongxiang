'use client';

import { useState } from 'react';
import { CommunityOption } from '@/types';

interface Props {
  value: string;
  districtValue?: string;
  onChange: (selection: { community: string; district: string; isCustom: boolean }) => void;
  communityOptions: CommunityOption[];
}

export function CommunityPicker({ value, districtValue = '', onChange, communityOptions }: Props) {
  const currentOption = communityOptions.find((community) => community.name === value);
  const [customMode, setCustomMode] = useState(() => Boolean(value && !currentOption));
  const [customInput, setCustomInput] = useState(() => (value && !currentOption ? value : ''));
  const pilotArea = districtValue || currentOption?.district || '东门口周边';

  const selectCommunity = (community: CommunityOption) => {
    setCustomMode(false);
    setCustomInput('');
    onChange({ community: community.name, district: community.district, isCustom: false });
  };

  const saveCustomCommunity = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    onChange({ community: trimmed, district: '附近小区', isCustom: true });
  };

  return (
    <div>
      <div className="mb-3 rounded-2xl border border-[#d9e6dd] bg-[#f7fbf4] px-4 py-3 text-xs leading-5 text-[#5d6b63]">
        优先服务东门口周边小区，找不到你的小区也可以手动填写。小区信息会帮助邻居判断面交是否方便。
      </div>

      {!customMode ? (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {communityOptions.map((community) => {
              const active = value === community.name;
              return (
                <button
                  key={community.name}
                  type="button"
                  onClick={() => selectCommunity(community)}
                  onPointerDown={() => {}}
                  className={`relative rounded-2xl border px-3 py-3 text-left transition-all active:opacity-70 ${
                    active
                      ? 'border-[#a8c3b1] bg-[#eef6f0] text-[#315846] shadow-sm'
                      : 'border-[rgba(201,189,171,0.42)] bg-white text-[#1c2d24] hover:border-[#a8c3b1]/60 hover:bg-[#f6faf7]'
                  }`}
                >
                  <div className="text-sm font-bold">{community.name}</div>
                  {active && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#5f806f] text-[10px] text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setCustomMode(true);
              setCustomInput(currentOption ? '' : value);
            }}
            onPointerDown={() => {}}
            className="mt-3 w-full rounded-2xl border border-dashed border-[#cfc5b4] bg-white/76 px-3 py-3 text-sm font-semibold text-[#5f6d64] active:bg-[#f8f2e7]"
          >
            找不到我的小区？手动添加
          </button>
        </>
      ) : (
        <div className="rounded-[22px] border border-[#e2d6c5] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(176,157,135,0.08)]">
          <p className="mb-2 text-xs font-semibold text-[#6f7a80]">手动填写小区名</p>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_96px]">
            <input
              type="text"
              value={customInput}
              onChange={(event) => setCustomInput(event.target.value)}
              placeholder="例如：东门口附近某某小区"
              className="soft-input min-h-[46px] min-w-0 rounded-2xl px-3 py-2.5 text-base sm:text-sm"
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveCustomCommunity();
              }}
              autoFocus
              maxLength={24}
            />
            <button
              type="button"
              onClick={saveCustomCommunity}
              onPointerDown={() => {}}
              disabled={!customInput.trim()}
              className="min-h-[46px] rounded-2xl bg-[#17362c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-45"
            >
              确认
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#9a8a70]">
            当前主要在东门口周边试点，其他附近小区也可以先使用，响应可能会少一些。
          </p>
          <button
            type="button"
            onClick={() => setCustomMode(false)}
            onPointerDown={() => {}}
            className="mt-2 text-xs font-semibold text-[#5f806f]"
          >
            返回内置小区
          </button>
        </div>
      )}

      {value && (
        <p className="mt-2 text-xs text-[#8a938d]">
          当前：{pilotArea} · {value}
        </p>
      )}
    </div>
  );
}
