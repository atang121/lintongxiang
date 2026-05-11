'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, Edit3, RotateCcw, Trash2 } from 'lucide-react';

import ItemCard from '@/components/ItemCard';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { normalizeItem } from '@/lib/normalize';
import { useToast } from '@/components/ui/Toast';
import { Item } from '@/types';

const STATUS_LABELS: Record<Item['status'], { label: string; className: string }> = {
  available: { label: '展示中', className: 'bg-[#e8f5ee] text-[#3e7a58]' },
  pending: { label: '预约中', className: 'bg-[#fff3dc] text-[#8a6a35]' },
  completed: { label: '已完成', className: 'bg-[#eef1f7] text-[#667482]' },
  deleted: { label: '已下架', className: 'bg-gray-100 text-gray-500' },
};

export default function ProfileItemsPage() {
  const { currentUser, refreshItems } = useApp();
  const { show } = useToast();
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [operatingId, setOperatingId] = useState('');

  const loadMyItems = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const result = await api.users.getMyItems(currentUser.id);
      setMyItems(result.data.map(normalizeItem));
    } catch (error: any) {
      show(error?.message || '加载我的发布失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMyItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const handleDownShelf = async (item: Item) => {
    setOperatingId(item.id);
    try {
      await api.items.delete(item.id);
      show('已下架，其他用户不会再看到这条发布', 'success');
      await Promise.all([loadMyItems(), refreshItems()]);
    } catch (error: any) {
      show(error?.message || '下架失败，请稍后重试', 'error');
    } finally {
      setOperatingId('');
    }
  };

  const handleRelist = async (item: Item) => {
    setOperatingId(item.id);
    try {
      await api.items.relist(item.id);
      show('已重新发布', 'success');
      await Promise.all([loadMyItems(), refreshItems()]);
    } catch (error: any) {
      show(error?.message || '重新发布失败，请稍后重试', 'error');
    } finally {
      setOperatingId('');
    }
  };

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

      {loading ? (
        <div className="paper-surface rounded-[32px] px-6 py-10 text-center">
          <div className="text-5xl animate-pulse">📦</div>
          <p className="mt-4 text-base text-[#607168]">正在加载我的发布...</p>
        </div>
      ) : myItems.length === 0 ? (
        <div className="paper-surface rounded-[32px] px-6 py-10 text-center">
          <div className="text-5xl">🌱</div>
          <p className="mt-4 text-base text-[#607168]">你还没有发布过物品</p>
          <Link href="/publish" className="mt-5 inline-flex rounded-full bg-[#17362c] px-5 py-3 text-sm font-semibold text-white">
            去发布第一件
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {myItems.map((item) => {
            const status = STATUS_LABELS[item.status];
            const operating = operatingId === item.id;

            return (
              <div key={item.id} className={`overflow-hidden rounded-[30px] bg-white/72 shadow-[0_14px_36px_rgba(180,159,136,0.08)] ${item.status === 'deleted' ? 'opacity-80' : ''}`}>
                <div className="relative">
                  <ItemCard item={item} showDistance={false} />
                  <span className={`absolute left-3 top-14 z-10 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-[#f1e8db] bg-[#fffdf8] p-3">
                  <Link
                    href={`/publish?edit=${item.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#eef4ef] px-3 py-2.5 text-xs font-bold text-[#1f3a30]"
                  >
                    <Edit3 size={14} />
                    编辑后发布
                  </Link>
                  {item.status === 'deleted' ? (
                    <button
                      type="button"
                      onClick={() => void handleRelist(item)}
                      disabled={operating}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#1f3a30] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      {operating ? '处理中' : '重新发布'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleDownShelf(item)}
                      disabled={operating || item.status === 'completed'}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#fff1ec] px-3 py-2.5 text-xs font-bold text-[#b85b44] disabled:opacity-45"
                    >
                      <Trash2 size={14} />
                      {operating ? '处理中' : '下架'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
