'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusSquare, Bell, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: '首页' },
  { href: '/publish', icon: PlusSquare, label: '发布' },
  { href: '/messages', icon: Bell, label: '消息' },
  { href: '/profile', icon: User, label: '我的' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useApp();
  const { isKeyboardOpen } = useKeyboardHeight();

  if (pathname === '/login') {
    return null;
  }

  // 键盘打开时隐藏底部导航，避免叠在键盘上方遮挡内容
  if (isKeyboardOpen) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e8dcc8] bg-[rgba(255,255,255,0.96)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex w-full max-w-[680px] items-center px-2 pt-2 pb-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const isMessage = item.href === '/messages';

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center gap-1 py-1"
              style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
            >
              {isMessage && unreadCount > 0 && (
                <span className="absolute right-[22%] top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}

              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'bg-[#eef6f0] text-[#3d6b57] scale-110'
                  : 'text-[#8c7d63]'
              }`}>
                <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>

              <span className={`text-[11px] font-medium leading-none transition-colors ${
                isActive ? 'text-[#3d6b57] font-semibold' : 'text-[#9b9487]'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
