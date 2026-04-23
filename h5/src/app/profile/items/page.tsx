'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import ItemCard from '@/components/ItemCard';
import { useApp } from '@/context/AppContext';

export default function ProfileItemsPage() {
  const { currentUser, getMyItems } = useApp();
  const myItems = getMyItems();

  if (!currentUser) {
    return (
      <div className="page-shell">
        <div className="paper-surface rounded-[32px] px-6 py-10 text-center">
          <div className="text-5xl">📦</div>
          <h1 className="mt-4 text-xl font-bold text-[#1c2d24]">登录后才能查看你的发布</h1>
          <Link href="/login" className="mt-5 inline-flex rounded-full bg-[#17362c] px-5 py-3 text-sm font-semibold text-white">
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/profile" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          <ChevronLeft size={18} className="text-[#5d6b63]" />
        </Link>
        <div>
          <p className="section-label">PROFILE ITEMS</p>
          <h1 className="mt-1 text-2xl font-bold text-[#1c2d24]">我的全部发布</h1>
        </div>
      </div>

      {myItems.length === 0 ? (
        <div className="paper-surface rounded-[32px] px-6 py-10 text-center">
          <div className="text-5xl">🌱</div>
          <p className="mt-4 text-base text-[#607168]">你还没有发布过物品</p>
          <Link href="/publish" className="mt-5 inline-flex rounded-full bg-[#17362c] px-5 py-3 text-sm font-semibold text-white">
            去发布第一件
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {myItems.map((item) => (
            <ItemCard key={item.id} item={item} showDistance={false} />
          ))}
        </div>
      )}
    </div>
  );
}
