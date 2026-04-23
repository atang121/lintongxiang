'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { BADGE_LIBRARY } from '@/lib/badges';

export default function ProfileBadgesPage() {
  const { currentUser } = useApp();

  if (!currentUser) {
    return (
      <div className="page-shell">
        <div className="paper-surface rounded-[32px] px-6 py-10 text-center">
          <div className="text-5xl">🏅</div>
          <h1 className="mt-4 text-xl font-bold text-[#1c2d24]">登录后查看你的荣誉徽章</h1>
          <Link href="/login" className="mt-5 inline-flex rounded-full bg-[#17362c] px-5 py-3 text-sm font-semibold text-white">
            去登录
          </Link>
        </div>
      </div>
    );
  }

  const unlocked = currentUser.badges;
  const locked = BADGE_LIBRARY.filter((badge) => !unlocked.find((item) => item.id === badge.id));

  return (
    <div className="page-shell">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/profile" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          <ChevronLeft size={18} className="text-[#5d6b63]" />
        </Link>
        <div>
          <p className="section-label">PROFILE BADGES</p>
          <h1 className="mt-1 text-2xl font-bold text-[#1c2d24]">我的徽章陈列柜</h1>
        </div>
      </div>

      <section className="paper-surface rounded-[32px] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1c2d24]">已点亮徽章</p>
            <p className="mt-1 text-xs text-[#7c8179]">每一次发布、交换和友善沟通，都会慢慢累积成你的邻里信用。</p>
          </div>
          <span className="rounded-full bg-[#eef4ef] px-3 py-1 text-xs font-semibold text-[#355746]">{unlocked.length} / {BADGE_LIBRARY.length}</span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {unlocked.map((badge) => (
            <div key={badge.id} className="rounded-[24px] border border-[#efe4d3] bg-[#fffaf3] px-4 py-5">
              <div className="text-3xl">{badge.icon}</div>
              <div className={`mt-4 text-base font-semibold ${badge.color}`}>{badge.name}</div>
              <p className="mt-2 text-sm leading-6 text-[#607168]">这枚徽章代表你在邻里交换中已经建立起稳定的信任感和参与度。</p>
            </div>
          ))}
        </div>

        {locked.length > 0 && (
          <>
            <div className="mt-8 border-t border-[#efe4d3] pt-5">
              <p className="text-sm font-semibold text-[#1c2d24]">待解锁徽章</p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {locked.map((badge) => (
                <div key={badge.id} className="rounded-[24px] border border-dashed border-[#e7ddca] bg-[#f8f3eb] px-4 py-5 opacity-70">
                  <div className="text-3xl grayscale">{badge.icon}</div>
                  <div className="mt-4 text-base font-semibold text-[#7b7f78]">{badge.name}</div>
                  <p className="mt-2 text-sm leading-6 text-[#8c8b82]">继续参与交换、完善资料和稳定回复，就会逐步点亮它。</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
