'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronLeft, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { api } from '@/lib/api';
import { DEFAULT_DEMO_ADMIN_TOKEN } from '@/lib/admin';

type AdminItem = {
  id: string;
  title: string;
  status: string;
  category: string;
  exchange_mode: string;
  owner_name: string;
  owner_community: string;
  created_at: string;
  images: string[];
};

const STATUS_LABEL: Record<string, string> = {
  available: '在架',
  pending:   '预约中',
  completed: '已完成',
  deleted:   '已删除',
};

const STATUS_COLOR: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  pending:   'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  deleted:   'bg-red-100 text-red-600',
};

export default function AdminPage() {
  const { currentUser } = useApp();
  const { show } = useToast();
  const router = useRouter();

  const [items, setItems] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [operating, setOperating] = useState<string | null>(null);

  // 删除确认弹窗
  const [confirmDialog, setConfirmDialog] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // 发布通知
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifType, setNotifType] = useState('system');
  const [broadcasting, setBroadcasting] = useState(false);

  const isAdmin = currentUser?.isAdmin;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getAllItems({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        keyword: keyword || undefined,
      });
      setItems(res.data as AdminItem[]);
    } catch {
      show('加载失败，请检查权限', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    if (!isAdmin) { router.replace('/'); return; }
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, filterStatus]);

  const handleDelete = async (id: string, title: string) => {
    setConfirmDialog({ id, title });
  };

  const confirmDelete = async () => {
    if (!confirmDialog) return;
    const { id } = confirmDialog;
    setConfirmDialog(null);
    setOperating(id);
    try {
      await api.admin.deleteItem(id);
      show('已删除', 'success');
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, status: 'deleted' } : item));
    } catch {
      show('删除失败', 'error');
    } finally {
      setOperating(null);
    }
  };

  const handleRestore = async (id: string) => {
    setOperating(id);
    try {
      await api.admin.restoreItem(id);
      show('已恢复', 'success');
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, status: 'available' } : item));
    } catch {
      show('恢复失败', 'error');
    } finally {
      setOperating(null);
    }
  };

  const handleBroadcast = async () => {
    if (!notifTitle.trim() || !notifContent.trim()) {
      show('请填写标题和内容', 'error');
      return;
    }
    setBroadcasting(true);
    try {
      const result = await api.admin.broadcastNotification(
        { title: notifTitle.trim(), content: notifContent.trim(), type: notifType },
        DEFAULT_DEMO_ADMIN_TOKEN
      );
      show(`通知已发送给 ${result.data.sent_count} 位用户 ✅`, 'success');
      setNotifTitle('');
      setNotifContent('');
    } catch (err: any) {
      show(err?.message || '发送失败', 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="page-shell flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[#8c949c]">请先登录</p>
        <Link href="/login" className="primary-button mt-4 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold">去登录</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-shell flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl">🔒</div>
        <p className="mt-4 text-[#8c949c]">无管理员权限</p>
        <Link href="/" className="mt-4 text-sm text-[#5f806f] underline">返回首页</Link>
      </div>
    );
  }

  const displayItems = keyword
    ? items.filter((i) =>
        i.title.includes(keyword) || i.owner_name.includes(keyword)
      )
    : items;

  return (
    <div className="min-h-screen bg-[#f6f0e5] pb-16">
      {/* 顶栏 */}
      <div className="sticky top-0 z-10 border-b border-[rgba(201,189,171,0.42)] bg-[rgba(255,252,247,0.94)] px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
            <ChevronLeft size={18} className="text-[#7b8791]" />
          </Link>
          <div className="flex-1">
            <div className="text-[11px] text-[#8a7d68]">ADMIN</div>
            <h1 className="text-[18px] font-bold text-[#1c2d24]">内容管理</h1>
          </div>
          <button onClick={fetchItems} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
            <RefreshCw size={16} className="text-[#5d6b63]" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-4 space-y-3">
        {/* 发布通知 */}
        <div className="paper-surface rounded-[24px] p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-[#d6ab62]" />
            <h2 className="text-sm font-bold text-[#55616b]">📢 发布系统通知</h2>
          </div>
          <p className="text-xs text-[#8c949c]">向所有注册用户推送一条通知，通知会显示在用户「消息 → 通知」中。</p>
          <input
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            placeholder="通知标题，例如：平台升级通知"
            className="soft-input w-full rounded-xl px-3 py-2.5 text-sm"
            maxLength={50}
          />
          <textarea
            value={notifContent}
            onChange={(e) => setNotifContent(e.target.value)}
            placeholder="通知内容，例如：邻里童享将于5月1日进行系统升级，届时服务可能会有短暂中断。"
            className="w-full resize-none rounded-xl bg-[#f8f2e7] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6ab62]/30"
            rows={3}
            maxLength={500}
          />
          <div className="flex items-center gap-2">
            <select
              value={notifType}
              onChange={(e) => setNotifType(e.target.value)}
              className="rounded-xl border border-[#e8dcc8] bg-white px-3 py-2 text-xs text-[#5e6f66] focus:outline-none"
            >
              <option value="system">🔔 系统通知</option>
              <option value="exchange">🤝 交换动态</option>
              <option value="message">💬 私信提醒</option>
            </select>
            <button
              onClick={handleBroadcast}
              disabled={broadcasting || !notifTitle.trim() || !notifContent.trim()}
              className="flex-1 rounded-xl bg-[#1f3a30] py-2 text-sm font-semibold text-white disabled:opacity-50 active:bg-[#173026]"
            >
              {broadcasting ? '发送中...' : '📢 推送给所有用户'}
            </button>
          </div>
        </div>

        {/* 搜索 + 筛选 */}
        <div className="paper-surface rounded-[24px] p-4 space-y-3">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
            placeholder="搜索标题或发布者昵称…"
            className="soft-input w-full rounded-xl px-3 py-2.5 text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            {(['all', 'available', 'pending', 'completed', 'deleted'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterStatus === s ? 'bg-[#1f3a30] text-white' : 'bg-[#f3ede2] text-[#5e6f66]'
                }`}
              >
                {s === 'all' ? '全部' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* 统计行 */}
        <p className="text-xs text-[#8c949c] px-1">
          共 {displayItems.length} 条记录
          {keyword && `（关键词：${keyword}）`}
        </p>

        {/* 物品列表 */}
        {loading ? (
          <div className="paper-surface rounded-[24px] p-8 text-center text-sm text-[#8c949c]">加载中…</div>
        ) : displayItems.length === 0 ? (
          <div className="paper-surface rounded-[24px] p-8 text-center text-sm text-[#8c949c]">暂无数据</div>
        ) : (
          <div className="paper-surface rounded-[28px] divide-y divide-[#f3ebdf] overflow-hidden">
            {displayItems.map((item) => {
              const isDeleted = item.status === 'deleted';
              const busy = operating === item.id;
              return (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3.5 ${isDeleted ? 'opacity-50' : ''}`}>
                  {/* 封面缩略图 */}
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[#f0e8db]">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1c2d24]">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#8c949c]">
                      {item.owner_name} · {item.owner_community}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[item.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                      <span className="text-[10px] text-[#b0a898]">
                        {item.created_at?.slice(0, 10)}
                      </span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    {isDeleted ? (
                      <button
                        disabled={busy}
                        onClick={() => handleRestore(item.id)}
                        className="flex items-center gap-1 rounded-xl bg-[#eef4ef] px-3 py-1.5 text-xs font-medium text-[#3d6b57] disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        恢复
                      </button>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() => handleDelete(item.id, item.title)}
                        className="flex items-center gap-1 rounded-xl bg-[#fef0ef] px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        删除
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {confirmDialog && (
        <ConfirmDialog
          open
          title="确认删除"
          message={`确定要删除「${confirmDialog.title}」吗？删除后用户将看不到此物品。`}
          confirmLabel="确认删除"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
