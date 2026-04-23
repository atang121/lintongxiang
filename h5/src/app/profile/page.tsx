'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Award, Camera, ChevronRight, LayoutGrid, MapPin, MessageCircle, PlusCircle, Settings, ShieldCheck } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { BADGE_LIBRARY } from '@/lib/badges';
import { api } from '@/lib/api';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { currentUser, getMyItems, updateUser } = useApp();
  const { show } = useToast();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const myItems = getMyItems();

  const rawScore = currentUser?.creditScore ?? 4.8;
  const displayScore = rawScore > 5 ? 4.8 : rawScore;
  const stats = [
    { label: '发布物品', value: myItems.length, emoji: '📦' },
    { label: '完成交换', value: currentUser?.exchangeCount ?? 0, emoji: '🤝' },
    { label: '信用评分', value: displayScore.toFixed(1), emoji: '⭐' },
  ];


  if (!currentUser) {
    return (
      <div className="min-h-screen">
        <div className="page-shell flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#f0e8db] text-4xl">
            👤
          </div>
          <h1 className="story-title mt-5 text-[26px] text-[#4b4138]">登录后开始交换</h1>
          <p className="mt-2 text-sm text-[#8c8f94]">发布闲置、联系邻居、查看消息</p>
          <Link href="/login" className="primary-button mt-6 inline-flex rounded-full px-8 py-3 text-sm font-semibold">
            登录 / 注册
          </Link>
          <Link href="/" className="mt-4 text-xs text-[#9da3a8] underline underline-offset-2">
            无需登录，先逛附近好物
          </Link>
        </div>
      </div>
    );
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      show(`图片太大（超过 ${MAX_MB}MB），请压缩后再试`, 'error');
      e.target.value = '';
      return;
    }

    setUploadingAvatar(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const result = await api.uploads.uploadImage({ data_url: dataUrl, file_name: file.name, category: 'avatars' });
      await updateUser({ avatar: result.data.url });
      show('头像已更新', 'success');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('size') || msg.includes('large') || msg.includes('413')) {
        show('图片太大，服务器拒绝了，请换张小一点的', 'error');
      } else {
        show('头像上传失败，请检查网络后重试', 'error');
      }
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const isAvatarUrl = currentUser.avatar?.startsWith('http');

  return (
    <div className="min-h-screen">
      <div className="page-shell">
        <div className="desktop-float overflow-hidden rounded-[34px] bg-[radial-gradient(circle_at_top_right,_rgba(214,171,98,0.28),_transparent_34%),linear-gradient(145deg,#17362c,#28483a_58%,#385b49)] px-5 pb-6 pt-6 text-white sm:px-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">我的邻里主页</h1>
            </div>
            <Link href="/profile/settings" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <Settings size={18} className="text-white" />
            </Link>
          </div>

          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

          <div className="flex items-start gap-4">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative h-[72px] w-[72px] shrink-0 sm:h-20 sm:w-20"
            >
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[24px] bg-white shadow">
                {isAvatarUrl ? (
                  <img
                    src={currentUser.avatar}
                    alt="头像"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-4xl">{currentUser.avatar || '😊'}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#d6ab62] shadow">
                {uploadingAvatar
                  ? <span className="text-[9px] text-white">…</span>
                  : <Camera size={12} className="text-white" />
                }
              </div>
            </button>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-bold">{currentUser.nickname}</span>
                {currentUser.isLiaison && (
                  <span className="rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-900">
                    🌟 童享大使
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-[#d9e8dd]">
                <MapPin size={14} />
                {currentUser.community}
              </div>
              {currentUser.bio && (
                <p className="mt-2 max-w-[42ch] text-sm leading-6 text-[#d9e8dd]/84">{currentUser.bio}</p>
              )}
            </div>
          </div>

          <div className="mt-5 flex divide-x divide-white/15 rounded-[24px] border border-white/12 bg-white/8 backdrop-blur-sm">
            {stats.map(({ label, value, emoji }) => (
              <div key={label} className="flex flex-1 flex-col items-center py-4">
                <div className="text-[22px] font-bold leading-none">{value}</div>
                <div className="mt-1.5 text-[11px] text-white/60">{emoji} {label}</div>
              </div>
            ))}
          </div>
        </div>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="paper-surface rounded-[32px] p-5">
            <div>
              <p className="section-label">我的发布</p>
              <h2 className="story-title mt-2 text-[28px] text-[#5a4c42]">我家正在流转的物品</h2>
            </div>

            <div className="mt-4 overflow-hidden rounded-[28px] border border-[#eadfca] bg-white/86">
              {myItems.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-5xl">📦</div>
                  <p className="mt-4 text-sm font-semibold text-[#55616b]">还没有发布过物品</p>
                  <p className="mt-1 text-xs text-[#8c949c]">从家里闲置的绘本、玩具或童车开始就很好</p>
                  <Link href="/publish" className="secondary-button mt-5 inline-flex rounded-full px-4 py-2.5 text-sm font-semibold">
                    立即发布
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#f3ebdf]">
                  {myItems.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={`/items/${item.id}`}
                      className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[#fffaf2]"
                    >
                      <img src={item.images[0]} alt={item.title} className="h-14 w-14 rounded-2xl object-cover flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#55616b]">{item.title}</p>
                        <p className="mt-1 text-xs text-[#8c949c]">
                          {item.status === 'available' ? '🟢 在架展示中' : item.status === 'pending' ? '🟡 已有人沟通' : '✅ 已完成流转'}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-[#c7bda9] flex-shrink-0" />
                    </Link>
                  ))}
                  {myItems.length > 4 && (
                    <div className="px-4 py-3 text-center">
                      <Link href="/profile/items" className="text-sm font-semibold text-[#5f806f]">
                        查看全部 {myItems.length} 件
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="paper-surface rounded-[32px] p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[#55616b]">
                  <Award size={16} className="text-[#d6ab62]" />
                  徽章进度
                </h2>
                <span className="text-xs text-[#8c949c]">
                  {currentUser.badges.length} / {BADGE_LIBRARY.length} 已解锁
                </span>
              </div>

              {/* 进度条 */}
              <div className="mb-4 h-1.5 w-full rounded-full bg-[#f0e8db]">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-[#a8c3b1] to-[#d6ab62] transition-all duration-500"
                  style={{ width: `${Math.max(4, (currentUser.badges.length / BADGE_LIBRARY.length) * 100)}%` }}
                />
              </div>

              {/* 全量网格 */}
              <div className="grid grid-cols-5 gap-2">
                {BADGE_LIBRARY.map((badge) => {
                  const unlocked = currentUser.badges.some((b) => b.id === badge.id);
                  return (
                    <div key={badge.id} className="group relative text-center">
                      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl transition-all ${
                        unlocked
                          ? 'border-[#efe6d7] bg-[#faf5eb] shadow-sm'
                          : 'border-[#f0ece6] bg-[#f8f4ef] grayscale opacity-35'
                      }`}>
                        {badge.icon}
                      </div>
                      <p className={`mt-1 text-[10px] leading-tight font-medium ${unlocked ? badge.color : 'text-[#b0a898]'}`}>
                        {badge.name}
                      </p>

                      {/* 悬浮解锁条件提示 */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-28 -translate-x-1/2 rounded-xl bg-[#1f3a30] px-2.5 py-2 text-center text-[10px] leading-4 text-white shadow-lg group-hover:block">
                        {unlocked ? '✓ 已解锁' : badge.condition}
                        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1f3a30]" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {currentUser.badges.length === 0 && (
                <p className="mt-3 text-center text-[11px] text-[#b0a898]">
                  完成第一次交换，解锁你的第一枚徽章 🌱
                </p>
              )}
            </div>

            <div className="paper-surface rounded-[32px] p-5">
              <div className="space-y-3">
                {[
                  { href: '/profile/settings', icon: Settings, label: '账号设置', desc: '修改昵称、小区，退出登录' },
                  { href: '/feedback', icon: MessageCircle, label: '投诉与建议', desc: '问题反馈、功能建议都欢迎' },
                  ...(currentUser.isAdmin ? [{ href: '/admin', icon: ShieldCheck, label: '内容管理', desc: '管理员：审核和删除发布内容' }] : []),
                  ...(currentUser.email === '273576151@qq.com' && !currentUser.isAdmin ? [{ href: '/admin', icon: ShieldCheck, label: '内容管理', desc: '管理员专属入口（需重新登录同步权限）' }] : []),
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-[22px] bg-white/76 px-4 py-3 transition-colors hover:bg-white"
                  >
                    <item.icon size={18} className="text-[#67766e]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#55616b]">{item.label}</div>
                      <div className="text-xs text-[#8c949c]">{item.desc}</div>
                    </div>
                    <ChevronRight size={16} className="text-[#c7bda9]" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-[#b6ab97]">邻里童享 · 以利他之心，让闲置流转</p>
      </div>
    </div>
  );
}
