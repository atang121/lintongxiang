'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, PackagePlus, Search, ShieldCheck, X } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import FilterBar from '@/components/FilterBar';
import ItemCard from '@/components/ItemCard';
import { formatRelativeTime } from '@/lib/time';



export default function HomePage() {
  const {
    getFilteredItems,
    notifications,
    currentUser,
  } = useApp();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const items = getFilteredItems().filter((item) => item.status !== 'completed' && item.status !== 'deleted');
  const actionableNotifications = notifications.filter(
    (notification) => !notification.read && notification.type === 'exchange'
  );
  const topNotification = actionableNotifications[0];

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

  const startBrowsing = () => {
    setShowWelcome(false);
    router.replace('/');
    window.setTimeout(() => {
      document.getElementById('item-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const publishOffer = () => {
    setShowWelcome(false);
    router.push('/publish?type=offer');
  };

  return (
    <div className="min-h-screen">
      <div className="page-shell">
        {showWelcome && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(44,52,58,0.28)] px-3 py-2 backdrop-blur-[2px]">
            <div className="relative max-h-[calc(100svh-1rem)] w-full max-w-[430px] rounded-[28px] border border-[rgba(201,189,171,0.42)] bg-[#fffdf8] px-4 pb-4 pt-5 shadow-[0_24px_70px_rgba(135,121,100,0.2)]">
              <button
                type="button"
                onClick={closeWelcome}
                onPointerDown={() => {}}
                aria-label="关闭欢迎引导"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/86 text-[#8d8174] shadow-sm active:scale-95"
              >
                <X size={18} />
              </button>

              <div className="flex justify-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#eef6f0] px-3 py-1.5 text-[11px] font-semibold text-[#5f806f]">
                  <Gift size={14} /> 欢迎加入
                </div>
              </div>
              <h2 className="story-title mt-3 text-center text-[24px] leading-tight text-[#56483f] min-[380px]:text-[26px]">
                欢迎加入童邻市集
              </h2>
              <p className="mx-auto mt-2 max-w-[330px] text-center text-[13px] leading-5 text-[#7b746b]">
                让孩子的闲置好物，在邻里之间继续被喜欢
              </p>

              <div className="my-3 border-t border-[rgba(201,189,171,0.34)]" />

              <section>
                <p className="text-[13px] font-bold text-[#4d6b59]">很多家长都在这样用</p>
                <div className="mt-2 space-y-2">
                  <button
                    type="button"
                    onClick={startBrowsing}
                    onPointerDown={() => {}}
                    className="w-full rounded-[18px] bg-[linear-gradient(135deg,#eef7f1,#fff8eb)] px-3 py-2.5 text-left shadow-[0_12px_30px_rgba(150,124,86,0.08)] active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#6f9381] shadow-sm">
                        <Search size={19} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-[#3f5f4c]">
                          逛附近好物
                          <span className="rounded-full bg-white/82 px-2 py-0.5 text-[10px] font-bold text-[#799681]">主推荐</span>
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-5 text-[#7a857d]">
                          先看看周边小区都有什么，绘本 / 玩具 / 童装，离你都很近
                        </span>
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={publishOffer}
                    onPointerDown={() => {}}
                    className="w-full rounded-[18px] bg-[#fff8ec] px-3 py-2.5 text-left shadow-[0_12px_30px_rgba(150,124,86,0.06)] active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#7a9b88] shadow-sm">
                        <PackagePlus size={19} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold text-[#56483f]">家里闲置太多？</span>
                        <span className="mt-0.5 block text-[12px] leading-5 text-[#8c949c]">
                          简单说一下，给孩子的旧物找个新主人
                        </span>
                      </span>
                    </div>
                  </button>
                </div>
              </section>

              <div className="my-3 border-t border-[rgba(201,189,171,0.34)]" />

              <section className="rounded-[18px] bg-[#f7fbf7] px-3 py-2.5">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[#4d6b59]">
                  <ShieldCheck size={17} />
                  更安心：周边小区 · 当面确认 · 不走平台交易
                </div>
              </section>

              <div className="my-3 border-t border-[rgba(201,189,171,0.34)]" />

              <div className="grid grid-cols-2 gap-2">
                <button onClick={startBrowsing} onPointerDown={() => {}} className="primary-button min-h-[44px] rounded-full px-3 py-2.5 text-sm font-bold">
                  先逛附近好物
                </button>
                <button onClick={publishOffer} onPointerDown={() => {}} className="secondary-button min-h-[44px] rounded-full px-3 py-2.5 text-sm font-bold">
                  发布我的闲置
                </button>
                <button onClick={closeWelcome} className="col-span-2 w-full text-center text-xs font-medium text-[#a39b90]">
                  随便看看也可以
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="pastel-stage rounded-[32px] px-4 pb-4 pt-4 sm:rounded-[40px] sm:px-8 sm:pb-7 sm:pt-7 lg:px-10">
          <div className="absolute left-[6%] top-[24%] hidden lg:block">
            <DoodleRainbow />
          </div>
          <div className="absolute right-[6%] top-[68%] hidden lg:block">
            <DoodleStar />
          </div>
          <div className="absolute right-[-20px] top-[-28px] h-60 w-60 rounded-[44%_56%_64%_36%/50%_42%_58%_50%] border-2 border-[#efd98f] bg-[radial-gradient(circle_at_45%_40%,rgba(255,239,179,0.58),rgba(255,233,150,0.22)_55%,transparent_75%)] opacity-45 blur-[0.2px]" />
          <div className="absolute bottom-[-50px] left-[-20px] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,213,198,0.52),rgba(255,213,198,0.14)_60%,transparent_76%)]" />

          <div className="relative max-w-2xl xl:max-w-none">
            <div className="inline-flex rounded-full border border-[rgba(205,194,176,0.58)] bg-white/76 px-3 py-1 text-xs font-medium text-[#8e938e] sm:py-1.5 sm:text-[13px]">
              📍 东门口周边 · 儿童闲置交换
            </div>
            <h1 className="story-title mt-3 whitespace-nowrap text-[24px] leading-[1.08] text-[#4b4138] min-[380px]:text-[26px] sm:mt-4 sm:text-[42px]">
              让孩子的好物继续被需要
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#67584d] sm:mt-3 sm:text-lg">
              绘本、中小学配套读物、玩具、童装等，看到感兴趣的，先预约沟通，谈好后再当面交接。
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:flex sm:gap-3">
              <a href="#item-feed" className="primary-button rounded-full px-2 py-2.5 text-center text-[13px] font-semibold sm:px-5 sm:text-sm">
                逛附近好物
              </a>
              <Link
                href="/publish?type=offer"
                className="secondary-button rounded-full px-2 py-2.5 text-center text-[13px] font-semibold sm:px-5 sm:text-sm"
              >
                🎁 发闲置
              </Link>
              <Link
                href="/publish?type=wanted"
                className="rounded-full border border-[#d4a96a] bg-[linear-gradient(180deg,#fff6e8,#fef0d8)] px-2 py-2.5 text-[13px] font-bold text-[#7a4a1e] shadow-sm active:brightness-95 sm:px-5 sm:text-sm"
              >
                🔍 发需求
              </Link>
            </div>

          </div>

        </section>

        {topNotification && (
          <div className="mt-4">
            <Link
              href={topNotification.relatedItemId ? `/items/${topNotification.relatedItemId}` : '/messages'}
              className="flex items-center gap-3 rounded-[24px] border border-[#ead7a7] bg-[#fffaf0] px-4 py-3 shadow-[0_12px_30px_rgba(150,124,86,0.08)] transition active:scale-[0.99]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#d9b46d] text-white shadow-sm">
                {topNotification.type === 'message' ? '信' : '约'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[#6d4424]">{topNotification.title}</p>
                  <span className="shrink-0 text-[11px] text-[#b28b55]">{formatTime(topNotification.createdAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[#8a6a45]">{topNotification.content}</p>
              </div>
              {actionableNotifications.length > 1 && (
                <span className="shrink-0 rounded-full bg-[#f1d084] px-2 py-1 text-xs font-semibold text-[#6d4424]">
                  {actionableNotifications.length} 条
                </span>
              )}
            </Link>
          </div>
        )}

        <div id="item-feed" className="mt-4 scroll-mt-28">
          <FilterBar />
        </div>

        <div className="mt-6">
          {items.length === 0 ? (
              <div className="rounded-[32px] border border-[#d5e8da] bg-[linear-gradient(135deg,#f0f7f2,#fdf8ef)] px-6 py-10 text-center">
                <div className="text-4xl">🌱</div>
                <p className="mt-4 text-base font-semibold text-[#3d5c4a]">
                  东门口还没有物品
                </p>
                <p className="mt-2 text-sm leading-7 text-[#6d8070]">
                  你可以成为第一个在这里发布的邻居。<br />
                  发布闲置或发布需求，让好物在邻里继续流转。
                </p>
                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/publish?type=offer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#3d5c4a] px-6 py-3 text-sm font-bold text-white shadow-sm active:bg-[#2f4a39]"
                  >
                    🎁 发第一件闲置 →
                  </Link>
                  <Link
                    href="/publish?type=wanted"
                    className="inline-flex items-center gap-2 rounded-full border border-[#d4a96a] bg-[linear-gradient(180deg,#fff6e8,#fef0d8)] px-6 py-3 text-sm font-bold text-[#7a4a1e] shadow-sm"
                  >
                    🔍 发一个需求 →
                  </Link>
                </div>
              </div>
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
  const relative = formatRelativeTime(iso);
  return relative === '刚刚' ? relative : `${relative}前`;
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
