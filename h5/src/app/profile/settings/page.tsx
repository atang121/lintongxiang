'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, LogOut, Mail, MapPin, Pencil, User } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { findStandardCommunityName } from '@/data/communities';
import { api } from '@/lib/api';

const MAX_EDITS_PER_YEAR = 2;
const CURRENT_YEAR = new Date().getFullYear();

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local.slice(0, 3)}****@${domain}`;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser, updateUser } = useApp();
  const { show } = useToast();

  const [editingNickname, setEditingNickname] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [communityInput, setCommunityInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateAccepted, setDeactivateAccepted] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

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
  const standardCommunityMatch = findStandardCommunityName(communityInput);

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
    const trimmed = communityInput.trim();
    if (!trimmed) {
      show('请填写新的小区名', 'error');
      return;
    }
    const nextCommunity = standardCommunityMatch?.name || trimmed;
    const nextDistrict = standardCommunityMatch?.district || '附近小区';
    if (nextCommunity === currentUser.community && nextDistrict === (currentUser.district || '')) {
      setEditingCommunity(false);
      return;
    }
    setSaving(true);
    try {
      await updateUser({ community: nextCommunity, district: nextDistrict });
      show('所在小区已更新', 'success');
      setEditingCommunity(false);
    } catch {
      show('保存失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  const clearSessionAndLeave = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('user');
      window.localStorage.removeItem('selectedCommunity');
    }
    setCurrentUser(null);
    router.replace('/login');
  };

  const deactivateAccount = async () => {
    if (!deactivateAccepted || deactivating) return;
    setDeactivating(true);
    try {
      await api.users.deactivate(currentUser.id);
      show('账号已注销', 'success');
      clearSessionAndLeave();
    } catch (error: any) {
      show(error?.message || '注销失败，请稍后重试', 'error');
    } finally {
      setDeactivating(false);
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
              <div className="flex items-start gap-3">
                <MapPin size={17} className="shrink-0 text-[#68756d]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-[#8a7d68]">所在小区 · 修改时请填写小区全称</div>
                  {!editingCommunity && (
                    <div className="mt-0.5 text-sm font-semibold text-[#1c2d24]">
                      {currentUser.district ? `${currentUser.district} · ` : ''}
                      {currentUser.community}
                    </div>
                  )}
                </div>
                {editingCommunity ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => setEditingCommunity(false)} className="rounded-full px-2 py-1 text-xs text-[#9da3a8]">取消</button>
                    <button onClick={saveCommunity} disabled={saving || !communityInput.trim()} className="rounded-full bg-[#17362c] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
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
              {editingCommunity && (
                <div className="mt-3">
                  <div className="rounded-[22px] border border-[#e2d6c5] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(176,157,135,0.08)]">
                    <label className="mb-2 block text-xs font-semibold text-[#6f7a80]">填写新的小区名</label>
                    <input
                      value={communityInput}
                      onChange={(event) => {
                        setCommunityInput(event.target.value);
                      }}
                      placeholder="例如：梧桐湾、丽江泊林"
                      className="soft-input min-h-[46px] w-full rounded-2xl px-3 py-2.5 text-base sm:text-sm"
                      autoFocus
                      maxLength={24}
                    />
                    {standardCommunityMatch ? (
                      <div className="mt-2 rounded-2xl bg-[#eef6f0] px-3 py-2 text-xs leading-5 text-[#4f6f5c]">
                        将保存为标准名称：<span className="font-bold">{standardCommunityMatch.name}</span>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs leading-5 text-[#9a8a70]">
                        若在东门口周边，请填写小区全称；不在内置小区也可以保存为附近小区。
                      </p>
                    )}
                  </div>
                </div>
              )}
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
          <p className="mb-4 text-xs leading-6 text-[#8c949c]">退出后仍可浏览同片区物品，再次登录即可恢复。</p>
          <button
            onClick={clearSessionAndLeave}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#17362c] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,56,45,0.22)]"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>

        <div className="rounded-[32px] border border-[#f0d8d0] bg-[#fff8f5] p-5">
          <h2 className="mb-2 text-sm font-semibold text-[#9b5a4f]">注销账号</h2>
          <p className="mb-4 text-xs leading-6 text-[#9b7a70]">
            注销后你将无法继续登录，该账号在架和预约中的发布会自动下架。平台会按法律法规及安全、纠纷处理、审计留痕等必要目的保留必要记录。
          </p>
          <button
            type="button"
            onClick={() => {
              setDeactivateAccepted(false);
              setShowDeactivateDialog(true);
            }}
            className="inline-flex w-full items-center justify-center rounded-[22px] border border-[#e5b7aa] bg-white px-5 py-3 text-sm font-bold text-[#b45a4b]"
          >
            申请注销账号
          </button>
        </div>
      </div>

      {showDeactivateDialog && (
        <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/36 px-4 pb-[max(18px,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center">
          <div className="w-full max-w-[420px] rounded-[30px] bg-[#fffdf8] p-5 shadow-[0_28px_80px_rgba(31,45,38,0.24)]">
            <p className="text-center text-base font-black text-[#1c2d24]">确认注销账号？</p>
            <div className="mt-4 rounded-2xl bg-[#fff4ee] px-4 py-3 text-xs leading-6 text-[#8f675e]">
              注销后该账号无法继续登录；你发布的在架和预约中内容会自动下架。历史私信、预约、反馈、违规处理等必要记录会按法律法规和平台安全需要保留。
            </div>
            <button
              type="button"
              onClick={() => setDeactivateAccepted((prev) => !prev)}
              className="mt-4 flex w-full items-start gap-2 rounded-2xl border border-[#eadfca] bg-white px-3 py-3 text-left text-xs leading-5 text-[#667268]"
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[11px] font-black ${
                deactivateAccepted ? 'border-[#b45a4b] bg-[#b45a4b] text-white' : 'border-[#b9c3ba] text-transparent'
              }`}>
                ✓
              </span>
              <span>我已理解注销后无法继续登录，相关发布会下架，必要记录将依法保留。</span>
            </button>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowDeactivateDialog(false)}
                className="min-h-12 rounded-2xl border border-[#e2d6c3] bg-white text-sm font-bold text-[#5f6d66]"
              >
                先不注销
              </button>
              <button
                type="button"
                onClick={() => void deactivateAccount()}
                disabled={!deactivateAccepted || deactivating}
                className="min-h-12 rounded-2xl bg-[#b45a4b] text-sm font-bold text-white disabled:opacity-45"
              >
                {deactivating ? '注销中' : '确认注销'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
