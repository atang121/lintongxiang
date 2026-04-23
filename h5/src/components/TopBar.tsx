'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, ChevronLeft, LayoutGrid, LogIn, MessageCircle, Pencil, PlusCircle, UserRound } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { XIANGYANG_DISTRICTS } from '@/data/communities';

const NAV_ITEMS = [
  { href: '/', label: '逛邻里', icon: LayoutGrid },
  { href: '/publish', label: '发布', icon: PlusCircle },
  { href: '/messages', label: '消息', icon: MessageCircle },
  { href: '/profile', label: '我的', icon: UserRound },
];

export default function TopBar() {
  const { currentUser, unreadCount, selectedCommunity, setSelectedCommunity, communityOptions } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // 弹窗两步流程状态
  const [portalStep, setPortalStep] = useState<'district' | 'community'>('district');
  const [portalDistrict, setPortalDistrict] = useState('');
  const [portalKeyword, setPortalKeyword] = useState('');

  // 打开弹窗时重置状态
  const handleOpen = () => {
    setOpen(true);
    setPortalStep('district');
    setPortalDistrict('');
    setPortalKeyword('');
  };

  // 关闭弹窗时清理状态
  const handleClose = () => {
    setOpen(false);
    setPortalStep('district');
    setPortalDistrict('');
    setPortalKeyword('');
  };

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // 区县内小区列表
  const districtCommunities = useMemo(() => {
    const trimmed = portalKeyword.trim();
    let list = communityOptions.filter((c) => c.district === portalDistrict);
    if (!trimmed) return list;
    return list.filter((c) =>
      `${c.name}${c.district}`.includes(trimmed)
    );
  }, [communityOptions, portalDistrict, portalKeyword]);

  return (
    <>
      <header
        className="sticky top-0 z-[100] touch-manipulation border-b border-[rgba(201,189,171,0.36)] bg-[#fffcf9]/95 md:bg-[rgba(255,252,247,0.92)] md:backdrop-blur-2xl"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <div className="mx-auto flex h-[68px] w-full max-w-[1380px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#f4e6a8,#cfe6d7)] px-3.5 py-2 shadow-[0_8px_22px_rgba(199,182,146,0.22)]">
              <span className="text-[13px] font-black tracking-[0.04em] text-[#4a6b57]">邻里童享</span>
            </div>
            <span className="hidden text-[11px] text-[#8a948f] sm:block">儿童闲置 · 公益流转</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 rounded-full border border-[rgba(201,189,171,0.42)] bg-white/80 p-1 shadow-[0_10px_24px_rgba(176,157,135,0.08)]">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                    active ? 'bg-[#f3ead7] text-[#5f806f] shadow-sm' : 'text-[#69747e] hover:bg-[#f8f1e4]'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="relative z-[105] ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleOpen}
              aria-label="选择小区"
              className="hidden min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-[rgba(201,189,171,0.42)] bg-white/82 px-3.5 py-2 text-left shadow-[0_10px_22px_rgba(176,157,135,0.08)] md:inline-flex active:scale-[0.97] md:active:opacity-80"
            >
              <span className="text-[11px] uppercase tracking-[0.22em] text-[#8a7d68]">邻里范围</span>
              <span className="max-w-[14ch] truncate text-sm font-semibold text-[#4d5b66]">
                {currentUser?.community || selectedCommunity || '选择小区'}
              </span>
              <ChevronDown size={14} className="text-[#68756d]" />
            </button>

            <div className="md:hidden">
              <button
                type="button"
                onClick={handleOpen}
                aria-label="选择小区"
                className="inline-flex min-h-[44px] min-w-0 cursor-pointer items-center gap-1.5 rounded-full border border-[rgba(201,189,171,0.42)] bg-white/82 px-3 py-2 text-xs font-medium text-[#68747e] shadow-[0_8px_18px_rgba(176,157,135,0.08)] active:scale-[0.97]"
              >
                <span className="max-w-[9ch] truncate">{currentUser?.community || selectedCommunity || '选择小区'}</span>
                <ChevronDown size={13} />
              </button>
            </div>
            <Link
              href="/messages"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(201,189,171,0.42)] bg-white/82 text-[#5b6770] shadow-[0_10px_22px_rgba(176,157,135,0.08)]"
              aria-label="查看消息"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e0b8a8] px-1 text-[10px] font-bold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            {!currentUser && (
              <Link
                href="/login"
                className="primary-button inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold sm:px-4"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">登录 / 注册</span>
                <span className="sm:hidden">登录</span>
              </Link>
            )}
            {currentUser && (
              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-full border border-[rgba(201,189,171,0.42)] bg-white/82 px-2.5 py-1.5 text-[#57636d] shadow-[0_10px_22px_rgba(176,157,135,0.08)] sm:inline-flex"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6efe4] text-base">
                  {currentUser.avatar}
                </span>
                <span className="max-w-[8ch] truncate text-sm font-semibold">{currentUser.nickname}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ========== 小区选择弹窗 ========== */}
      {open && (
        <div
          className="fixed inset-0 z-[220] flex items-end justify-center lg:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="community-picker-title"
        >
          {/* 遮罩 */}
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 cursor-default border-0 bg-black/40 p-0"
            onClick={handleClose}
          />

          {/* 弹窗主体 */}
          <div
            className="relative z-[1] w-full max-h-[90vh] overflow-hidden flex flex-col rounded-t-[28px] bg-[#fffcf8] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] lg:max-h-[85vh] lg:max-w-xl lg:rounded-[32px] lg:border lg:border-[rgba(201,189,171,0.42)]"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 id="community-picker-title" className="text-lg font-bold text-[#1c2d24]">
                  {portalStep === 'district' ? '选择区县' : portalDistrict}
                </h2>
                <p className="mt-0.5 text-xs text-[#6f7f76]">
                  <span className="mr-2 rounded-full bg-[#eef4f0] px-2 py-0.5 text-[#5f806f]">📍 襄阳市</span>
                  {portalStep === 'district' ? '先选区县，再选小区' : '选择具体小区'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {portalStep === 'community' && (
                  <button
                    type="button"
                    onClick={() => setPortalStep('district')}
                    className="flex items-center gap-1 text-xs text-[#6f7f76] hover:text-[#3d6b57]"
                  >
                    <ChevronLeft size={13} />
                    返回区县
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full border border-[rgba(201,189,171,0.42)] bg-white px-3 py-1.5 text-xs text-[#6b7680] active:opacity-70"
                >
                  关闭
                </button>
              </div>
            </div>

            {/* 内容区（可滚动） */}
            <div className="overflow-y-auto overscroll-contain px-5" style={{ maxHeight: 'calc(90vh - 100px)', flex: 1 }}>
              {/* ========== 步骤一：选择区县 ========== */}
              {portalStep === 'district' && (
                <div className="grid grid-cols-3 gap-1.5 pb-4">
                  {XIANGYANG_DISTRICTS.map(({ name, type }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setPortalDistrict(name);
                        setPortalKeyword('');
                        setPortalStep('community');
                      }}
                      onPointerDown={(e) => e.preventDefault()}
                      className="rounded-2xl border border-[rgba(201,189,171,0.42)] bg-white px-2 py-2.5 text-center transition-colors hover:bg-[#eef6f0] active:bg-[#e0ede4]"
                    >
                      <div className="text-sm font-semibold text-[#1c2d24]">{name}</div>
                      <div className="mt-0.5 text-[10px] text-[#b0bab5]">{type}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* ========== 步骤二：选择小区 ========== */}
              {portalStep === 'community' && (
                <div className="pb-4">
                  {/* 搜索 */}
                  <input
                    value={portalKeyword}
                    onChange={(e) => setPortalKeyword(e.target.value)}
                    placeholder="搜索小区名"
                    className="soft-input mb-3 w-full rounded-2xl px-4 py-2.5 text-sm text-[#495660]"
                  />

                  {districtCommunities.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-[#a0a8a4]">该区县暂无预设小区</p>
                      <button
                        type="button"
                        onClick={() => setPortalStep('district')}
                        className="mt-3 flex items-center gap-1 text-xs text-[#5f806f] hover:underline"
                      >
                        <ChevronLeft size={11} />
                        重新选择区县
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5">
                      {districtCommunities.map((c) => {
                        const active = selectedCommunity === c.name || currentUser?.community === c.name;
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => {
                              setSelectedCommunity(c.name);
                              handleClose();
                            }}
                            onPointerDown={(e) => e.preventDefault()}
                            className={`rounded-2xl border px-4 py-3 text-left transition-all active:opacity-70 ${
                              active
                                ? 'border-[#a8c3b1] bg-[#eef6f0] text-[#5f806f]'
                                : 'border-[rgba(201,189,171,0.42)] bg-white text-[#495660] hover:border-[#a8c3b1]/60'
                            }`}
                          >
                            <span className="text-sm font-semibold">{c.name}</span>
                            {active && <span className="ml-2 text-xs text-[#7f9688]">✓ 当前</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
