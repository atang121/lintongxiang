'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useApp } from '@/context/AppContext';
import EmptyState from '@/components/ui/EmptyState';
import FilterBar from '@/components/FilterBar';
import ItemCard from '@/components/ItemCard';



export default function HomePage() {
  const {
    getFilteredItems,
    notifications,
    selectedCommunity,
    currentUser,
    filters,
  } = useApp();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const allFiltered = getFilteredItems();
  const items = allFiltered.filter((item) => item.status !== 'completed' && item.status !== 'deleted');
  const unreadNotifs = notifications.filter((notification) => !notification.read);
  const activeCommunity = selectedCommunity || '';
  console.log('[Home] render, items.length=', items.length, 'allFiltered.length=', allFiltered.length, 'filters.listingType=', filters.listingType);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) {
      setShowWelcome(false);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setShowWelcome(params.get('welcome') === '1');
  }, [currentUser]);

  const closeWelcome = () => {
    setShowWelcome(false);
    router.replace('/');
  };

  return (
    <div className="min-h-screen">
      <div className="page-shell">
        {showWelcome && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(44,52,58,0.28)] px-4 pb-4 pt-16 sm:items-center">
            <div className="w-full max-w-[460px] rounded-[34px] border border-[rgba(201,189,171,0.42)] bg-[#fffdf8] p-6 shadow-[0_24px_70px_rgba(135,121,100,0.18)]">
              <div className="inline-flex rounded-full bg-[#eef6f0] px-3 py-1 text-xs font-semibold text-[#7d9d89]">
                新手提示
              </div>
              <h2 className="story-title mt-4 text-[28px] text-[#56483f]">欢迎加入邻里童享</h2>
              <p className="mt-3 text-sm leading-7 text-[#7c858d]">
                先完成这 3 步，就能更顺手地开始体验。
              </p>
              <div className="mt-5 space-y-3">
                {[
                  '确认顶部选择的小区是否准确，列表会以该小区为中心、按你选的半径（默认 3km）展示。',
                  '需要多看一点时，在筛选里把范围改到 5km。',
                  '看到合适的先发消息沟通，再约时间面交。',
                ].map((tip, index) => (
                  <div key={tip} className="flex items-start gap-3 rounded-[22px] bg-[#fff8ec] px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#a48b68]">
                      {index + 1}
                    </div>
                    <div className="text-sm leading-6 text-[#66717a]">{tip}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button onClick={closeWelcome} className="primary-button rounded-full px-5 py-3 text-sm font-semibold">
                  开始逛附近好物
                </button>
                <button onClick={closeWelcome} className="secondary-button rounded-full px-5 py-3 text-sm font-semibold">
                  稍后再看
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="pastel-stage rounded-[42px] px-5 pb-6 pt-6 sm:px-8 sm:pb-8 lg:px-10 lg:pt-8">
          <div className="absolute left-[6%] top-[24%] hidden lg:block">
            <DoodleRainbow />
          </div>
          <div className="absolute right-[6%] top-[68%] hidden lg:block">
            <DoodleStar />
          </div>
          <div className="absolute right-[-20px] top-[-28px] h-60 w-60 rounded-[44%_56%_64%_36%/50%_42%_58%_50%] border-2 border-[#efd98f] bg-[radial-gradient(circle_at_45%_40%,rgba(255,239,179,0.58),rgba(255,233,150,0.22)_55%,transparent_75%)] opacity-45 blur-[0.2px]" />
          <div className="absolute bottom-[-50px] left-[-20px] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,213,198,0.52),rgba(255,213,198,0.14)_60%,transparent_76%)]" />

          <div className="relative max-w-2xl xl:max-w-none">
            <div className="inline-flex rounded-full border border-[rgba(205,194,176,0.58)] bg-white/76 px-3 py-1.5 text-xs text-[#8e938e]">
              {activeCommunity
                ? `${activeCommunity} · 以小区为中心 · 周边 ${filters.distance}km`
                : '先选择小区，再看附近好物'}
            </div>
            <h1 className="story-title mt-4 text-[36px] leading-[1.1] text-[#4b4138] sm:text-[48px]">
              邻里童物交换
            </h1>
            <p className="mt-3 text-base text-[#67584d] sm:text-lg">
              让孩子闲置的好物，在附近继续被需要。
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#item-feed" className="primary-button rounded-full px-5 py-2.5 text-sm font-semibold text-center">
                逛附近好物
              </a>
              <Link
                href="/publish?type=offer"
                className="secondary-button rounded-full px-5 py-2.5 text-sm font-semibold text-center"
              >
                🎁 发布闲置
              </Link>
              <Link
                href="/publish?type=wanted"
                className="rounded-full border border-[#d4a96a] bg-[linear-gradient(180deg,#fff6e8,#fef0d8)] px-5 py-2.5 text-sm font-bold text-[#7a4a1e] shadow-sm active:brightness-95"
              >
                🔍 发布需求
              </Link>
            </div>

          </div>

        </section>


        {unreadNotifs.length > 0 && (
          <div className="mt-4">
            <div className="paper-surface rounded-[28px] border border-[#ead7a7] bg-[#fff6df] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d9b46d] text-white shadow-sm">铃</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#6d4424]">{unreadNotifs[0].title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#7d5836]">{unreadNotifs[0].content}</p>
                  <p className="mt-2 text-xs text-[#b28b55]">{formatTime(unreadNotifs[0].createdAt)}</p>
                </div>
                <span className="rounded-full bg-[#f1d084] px-2 py-1 text-xs font-semibold text-[#6d4424]">
                  {unreadNotifs.length} 条
                </span>
              </div>
            </div>
          </div>
        )}

        <div id="item-feed" className="mt-4">
          <FilterBar />
        </div>

        <div className="mt-6">
          {items.length === 0 ? (
            !activeCommunity ? (
              <div className="rounded-[32px] border border-[rgba(201,189,171,0.42)] bg-white/70 px-6 py-10 text-center">
                <div className="text-4xl">🏡</div>
                <p className="mt-4 text-base font-semibold text-[#4b5862]">先选择你的小区</p>
                <p className="mt-2 text-sm leading-7 text-[#8c949c]">点击顶部「选择小区」，就能看到附近邻居发布的闲置物品。</p>
              </div>
            ) : (
              <div className="rounded-[32px] border border-[#d5e8da] bg-[linear-gradient(135deg,#f0f7f2,#fdf8ef)] px-6 py-10 text-center">
                <div className="text-4xl">🌱</div>
                <p className="mt-4 text-base font-semibold text-[#3d5c4a]">
                  {activeCommunity} 附近暂时没有物品
                </p>
                <p className="mt-2 text-sm leading-7 text-[#6d8070]">
                  你可以发一个需求，让附近邻居看到你在找什么。<br />
                  或者发布你的闲置，成为第一个在这里分享的邻居。
                </p>
                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/publish?type=wanted"
                    className="inline-flex items-center gap-2 rounded-full bg-[#3d5c4a] px-6 py-3 text-sm font-bold text-white shadow-sm active:bg-[#2f4a39]"
                  >
                    🔍 发一个需求 →
                  </Link>
                  <Link
                    href="/publish?type=offer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#d4a96a] bg-[linear-gradient(180deg,#fff6e8,#fef0d8)] px-6 py-3 text-sm font-bold text-[#7a4a1e] shadow-sm"
                  >
                    🎁 发布闲置 →
                  </Link>
                  <button
                    onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="选择小区"]')?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#c2d9c9] bg-white px-5 py-3 text-sm font-medium text-[#4d6b5a]"
                  >
                    换个小区找找
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function formatTime(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

function DoodleRainbow() {
  return (
    <svg width="150" height="110" viewBox="0 0 150 110" aria-hidden="true">
      <path className="doodle-stroke" d="M18 88c8-14 22-20 41-20s33 6 41 20" />
      <path className="doodle-stroke" d="M30 84c7-10 18-15 29-15s22 5 29 15" />
      <path className="doodle-stroke" d="M42 80c5-6 12-9 17-9s12 3 17 9" />
      <path className="doodle-stroke" d="M14 88c-4-4-8-4-11 0" />
      <path className="doodle-stroke" d="M100 88c5-7 12-9 20-7 3-7 11-11 18-8" />
    </svg>
  );
}

function DoodleStar() {
  return (
    <svg width="170" height="150" viewBox="0 0 170 150" aria-hidden="true">
      <path className="doodle-stroke-blue" d="M16 132c10-36 38-56 84-58" />
      <path className="doodle-stroke-blue" d="M102 76c9-2 20 0 34 8" />
      <path className="doodle-stroke-blue" d="M123 38c4 8 10 12 19 12-9 1-15 5-19 14-2-9-8-13-17-14 8 0 14-4 17-12Z" />
      <circle cx="128" cy="59" r="2.2" fill="rgba(159,186,212,0.9)" />
      <circle cx="117" cy="64" r="2.2" fill="rgba(159,186,212,0.9)" />
    </svg>
  );
}
