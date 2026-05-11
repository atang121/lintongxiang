'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, LayoutGrid, LogIn, MessageCircle, PlusCircle, UserRound } from 'lucide-react';

import { useApp } from '@/context/AppContext';

const NAV_ITEMS = [
  { href: '/', label: '逛市集', icon: LayoutGrid },
  { href: '/publish', label: '发布', icon: PlusCircle },
  { href: '/messages', label: '消息', icon: MessageCircle },
  { href: '/profile', label: '我的', icon: UserRound },
];

const BRAND_CHARS = [
  { text: '童', color: 'text-[#f38a17]' },
  { text: '邻', color: 'text-[#65a83a]' },
  { text: '市', color: 'text-[#238ec1]' },
  { text: '集', color: 'text-[#ef5b57]' },
];

export default function TopBar() {
  const { currentUser, unreadCount } = useApp();
  const pathname = usePathname();
  const showMessageShortcut = pathname !== '/messages';

  return (
    <>
      <header
        className="sticky top-0 z-[100] touch-manipulation border-b border-[rgba(201,189,171,0.36)] bg-[#fffcf9]/95 md:bg-[rgba(255,252,247,0.92)] md:backdrop-blur-2xl"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <div className="mx-auto flex h-[60px] w-full max-w-[1380px] items-center gap-3 px-4 sm:h-[68px] sm:px-6">
          <Link href="/" className="flex min-w-0 items-center" aria-label="童邻市集首页">
            <div className="min-w-0">
              <div className="flex items-baseline whitespace-nowrap text-[22px] font-black leading-none tracking-normal sm:text-[32px]">
                {BRAND_CHARS.map((char) => (
                  <span key={char.text} className={`${char.color} drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]`}>
                    {char.text}
                  </span>
                ))}
              </div>
              <div className="mt-1 hidden whitespace-nowrap text-[10px] font-semibold tracking-normal text-[#8a6042] sm:block">
                闲置有爱 · 邻里互助 · 绿色成长
              </div>
              <div className="mt-0.5 whitespace-nowrap text-[9px] font-semibold tracking-normal text-[#8a6042] sm:hidden">
                闲置有爱 · 邻里互助
              </div>
            </div>
          </Link>

          <nav className="hidden lg:ml-4 lg:flex items-center gap-1 rounded-full border border-[rgba(201,189,171,0.42)] bg-white/80 p-1 shadow-[0_10px_24px_rgba(176,157,135,0.08)]">
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
            {showMessageShortcut && (
              <Link
                href="/messages"
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(201,189,171,0.42)] bg-white/82 text-[#5b6770] shadow-[0_10px_22px_rgba(176,157,135,0.08)] sm:h-10 sm:w-10"
                aria-label="查看消息"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e0b8a8] px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
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
    </>
  );
}
