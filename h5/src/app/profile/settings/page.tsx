'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut, Mail, MapPin, Pencil, User } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { CommunityPicker } from '@/components/CommunityPicker';

const MAX_EDITS_PER_YEAR = 2;
const CURRENT_YEAR = new Date().getFullYear();

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local.slice(0, 3)}****@${domain}`;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser, updateUser, communityOptions } = useApp();
  const { show } = useToast();

  const [editingNickname, setEditingNickname] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [communityInput, setCommunityInput] = useState('');
  const [districtInput, setDistrictInput] = useState('');
  const [isCustomCommunityInput, setIsCustomCommunityInput] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!currentUser) {
    return (
      <div className="page-shell">
        <div className="paper-surface rounded-[32px] px-6 py-10 text-center">
          <div className="text-5xl">⚙️</div>
          <h1 className="mt-4 text-xl font-bold text-[#1c2d24]">登录后管理你的账号设置</h1>
          <Link href="/login" className="mt-5 inline-flex rounded-full bg-[#17362c] px-5 py-3 text-sm font-semibold text-white">
            去登录
          </Link>
        </div>
      </div>
    );
  }

  const nicknameLeft = MAX_EDITS_PER_YEAR - (currentUser.nicknameEditsUsed ?? 0);
  const communityLeft = MAX_EDITS_PER_YEAR - (currentUser.communityEditsUsed ?? 0);

  const startEditNickname = () => {
    if (nicknameLeft <= 0) {
      show(`今年昵称修改次数已用完，${CURRENT_YEAR + 1}年可再改`, 'error');
      return;
    }
    setNicknameInput(currentUser.nickname);
    setEditingNickname(true);
  };

  const startEditCommunity = () => {
    if (communityLeft <= 0) {
      show(`今年小区修改次数已用完，${CURRENT_YEAR + 1}年可再改`, 'error');
      return;
    }
    setCommunityInput(currentUser.community);
    setDistrictInput(currentUser.district || '');
    setEditingCommunity(true);
  };

  const saveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) { show('昵称不能为空', 'error'); return; }
    if (trimmed === currentUser.nickname) { setEditingNickname(false); return; }
    setSaving(true);
    try {
      await updateUser({ nickname: trimmed });
      show('昵称已更新', 'success');
      setEditingNickname(false);
    } catch {
      show('保存失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveCommunity = async () => {
    if (!communityInput || communityInput === currentUser.community) {
      setEditingCommunity(false);
      return;
    }
    setSaving(true);
    try {
      await updateUser({ community: communityInput, district: districtInput, isCustomCommunity: isCustomCommunityInput });
      show(isCustomCommunityInput ? '小区已更新（人工审核后将加入官方列表）' : '所在小区已更新', 'success');
      setEditingCommunity(false);
    } catch {
      show('保存失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/profile" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          <ChevronLeft size={18} className="text-[#5d6b63]" />
        </Link>
        <h1 className="text-xl font-bold text-[#1c2d24]">账号设置</h1>
      </div>

      <div className="space-y-3">
        <div className="paper-surface rounded-[32px] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[#6f7a80]">账号资料</h2>
          <div className="space-y-2">

            {/* 昵称 */}
            <div className="rounded-[22px] bg-[#f8f2e8] px-4 py-3">
              <div className="flex items-center gap-3">
                <User size={17} className="shrink-0 text-[#68756d]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-[#8a7d68]">昵称 · 邻居看到的你的名字</div>
                  {editingNickname ? (
                    <input
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      className="mt-1 w-full rounded-lg bg-white px-2 py-1 text-sm text-[#1c2d24] focus:outline-none focus:ring-2 focus:ring-[#3d6b57]/30"
                      autoFocus
                      maxLength={16}
                    />
                  ) : (
                    <div className="mt-0.5 text-sm font-semibold text-[#1c2d24]">{currentUser.nickname}</div>
                  )}
                </div>
                {editingNickname ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingNickname(false)} className="text-xs text-[#9da3a8]">取消</button>
                    <button onClick={saveNickname} disabled={saving} className="rounded-full bg-[#17362c] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
                      {saving ? '保存中' : '保存'}
                    </button>
                  </div>
                ) : (
                  <button onClick={startEditNickname} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-xs text-[#5d6b63] shadow-sm">
                    <Pencil size={11} />
                    {nicknameLeft > 0 ? `还可改 ${nicknameLeft} 次` : '已用完'}
                  </button>
                )}
              </div>
            </div>

            {/* 所在小区 */}
            <div className="rounded-[22px] bg-[#f8f2e8] px-4 py-3">
              <div className="flex items-center gap-3">
                <MapPin size={17} className="shrink-0 text-[#68756d]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-[#8a7d68]">所在小区 · 决定邻居看到你的物品范围</div>
                  {editingCommunity ? (
                    <div className="mt-2">
                      <CommunityPicker
                        value={communityInput}
                        districtValue={districtInput}
                        onChange={({ community, district, isCustom }) => {
                          setCommunityInput(community);
                          setDistrictInput(district);
                          setIsCustomCommunityInput(isCustom);
                        }}
                        communityOptions={communityOptions}
                      />
                    </div>
                  ) : (
                    <div className="mt-0.5 text-sm font-semibold text-[#1c2d24]">
                      {currentUser.district ? `${currentUser.district} · ` : ''}
                      {currentUser.community}
                    </div>
                  )}
                </div>
                {editingCommunity ? (
                  <div className="flex gap-2 self-start mt-1">
                    <button onClick={() => setEditingCommunity(false)} className="text-xs text-[#9da3a8]">取消</button>
                    <button onClick={saveCommunity} disabled={saving} className="rounded-full bg-[#17362c] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
                      {saving ? '保存中' : '保存'}
                    </button>
                  </div>
                ) : (
                  <button onClick={startEditCommunity} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-xs text-[#5d6b63] shadow-sm">
                    <Pencil size={11} />
                    {communityLeft > 0 ? `还可改 ${communityLeft} 次` : '已用完'}
                  </button>
                )}
              </div>
            </div>

            {/* 登录邮箱（只读） */}
            <div className="flex items-center gap-3 rounded-[22px] bg-[#f8f2e8] px-4 py-3">
              <Mail size={17} className="shrink-0 text-[#68756d]" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-[#8a7d68]">登录邮箱</div>
                <div className="mt-0.5 truncate text-sm font-semibold text-[#1c2d24]">
                  {currentUser.email ? maskEmail(currentUser.email) : '未绑定'}
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-6 text-[#b0a89a]">
            昵称和小区每年各可修改 {MAX_EDITS_PER_YEAR} 次，请认真填写。
          </p>
        </div>

        <div className="paper-surface rounded-[32px] p-5">
          <h2 className="mb-2 text-sm font-semibold text-[#6f7a80]">退出登录</h2>
          <p className="mb-4 text-xs leading-6 text-[#8c949c]">退出后仍可浏览附近物品，再次登录即可恢复。</p>
          <button
            onClick={() => { setCurrentUser(null); router.push('/'); }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#17362c] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,56,45,0.22)]"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
