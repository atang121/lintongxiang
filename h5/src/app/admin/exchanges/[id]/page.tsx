'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ArrowLeftRight, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

const EXCHANGE_STATUS_LABEL: Record<string, string> = {
  pending: '进行中',
  completed: '已完成',
  cancelled: '已取消',
  failed: '已失败',
};
const EXCHANGE_STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-600',
};
const EXCHANGE_STATUS_EMOJI: Record<string, string> = {
  pending: '🟡',
  completed: '✅',
  cancelled: '⚪',
  failed: '🔴',
};

export default function ExchangeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useApp();
  const { show } = useToast();
  const id = params.id as string;

  const [exchange, setExchange] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [showFailDialog, setShowFailDialog] = useState(false);

  const fetchExchange = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getExchanges({ limit: 100 });
      const found = (res.data as any[]).find((e: any) => String(e.id) === id);
      if (found) {
        setExchange(found);
      } else {
        show('交换记录不存在', 'error');
        router.replace('/admin');
      }
    } catch {
      show('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.isAdmin) { router.replace('/'); return; }
    fetchExchange();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!currentUser?.isAdmin) return null;

  if (loading || !exchange) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f0e5]">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🔄</div>
          <p className="text-[#8c7d63]">加载中...</p>
        </div>
      </div>
    );
  }

  const status = String(exchange.status || 'pending');
  const isPending = status === 'pending';
  const itemImages = (() => { try { return JSON.parse(String(exchange.item_images || '[]')); } catch { return []; } })();

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    setOperating(true);
    try {
      await api.admin.setExchangeStatus(id, newStatus, reason);
      const STATUS_MSG: Record<string, string> = { completed: '已标记完成', cancelled: '已取消预约', failed: '已标记失败' };
      show(STATUS_MSG[newStatus] || '操作成功', 'success');
      await fetchExchange();
    } catch (err: any) {
      show(err?.message || '操作失败', 'error');
    } finally {
      setOperating(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#f6f0e5] pb-20">
      {/* 顶栏 */}
      <div className="sticky top-0 z-10 border-b border-[rgba(201,189,171,0.42)] bg-[rgba(255,252,247,0.94)] px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/admin" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
            <ChevronLeft size={18} className="text-[#7b8791]" />
          </Link>
          <div className="flex-1">
            <div className="text-[11px] text-[#8a7d68]">EXCHANGE</div>
            <h1 className="text-[18px] font-bold text-[#1c2d24]">交换详情</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${EXCHANGE_STATUS_COLOR[status]}`}>
            {EXCHANGE_STATUS_EMOJI[status]} {EXCHANGE_STATUS_LABEL[status]}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-4 space-y-3">
        {/* 物品信息 */}
        <div className="paper-surface rounded-[24px] p-4">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[#f0e8db]">
              {itemImages[0] ? (
                <img src={itemImages[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/items/${exchange.item_id}`} className="text-sm font-semibold text-[#1c2d24] hover:underline">
                {exchange.item_title || '未知物品'}
              </Link>
              <p className="mt-0.5 text-[11px] text-[#8c949c]">
                物品状态：{String(exchange.item_status || '-')}
              </p>
            </div>
          </div>
        </div>

        {/* 双方信息 */}
        <div className="paper-surface rounded-[24px] p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ArrowLeftRight size={16} className="text-[#5f806f]" />
            <h2 className="text-sm font-bold text-[#55616b]">交换双方</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-lg">🙋</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1c2d24]">{exchange.requester_nickname || '未知'}</p>
              <p className="text-[11px] text-[#8c949c]">{exchange.requester_community || ''}</p>
            </div>
            <span className="text-xs text-[#8c949c]">预约者</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-lg">🏠</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1c2d24]">{exchange.owner_nickname || '未知'}</p>
              <p className="text-[11px] text-[#8c949c]">{exchange.owner_community || ''}</p>
            </div>
            <span className="text-xs text-[#8c949c]">物主</span>
          </div>
          {exchange.message && (
            <div className="rounded-xl bg-[#f8f2e7] px-3 py-2 text-xs text-[#5e6f66]">
              💬 {exchange.message}
            </div>
          )}
        </div>

        {/* 时间线 */}
        <div className="paper-surface rounded-[24px] p-4 space-y-2">
          <h2 className="text-sm font-bold text-[#55616b] mb-2">操作时间线</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8c949c]">创建时间</span>
            <span className="font-medium text-[#1c2d24]">{formatDate(exchange.created_at)}</span>
          </div>
          {exchange.completed_at && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8c949c]">完成时间</span>
              <span className="font-medium text-[#3d6b57]">{formatDate(exchange.completed_at)}</span>
            </div>
          )}
          {exchange.cancelled_at && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8c949c]">取消时间</span>
              <span className="font-medium text-[#6f7f76]">{formatDate(exchange.cancelled_at)}</span>
            </div>
          )}
          {exchange.failed_at && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8c949c]">失败时间</span>
              <span className="font-medium text-red-600">{formatDate(exchange.failed_at)}</span>
            </div>
          )}
          {exchange.fail_reason && (
            <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
              ⚠️ 失败原因：{exchange.fail_reason}
            </div>
          )}
        </div>

        {/* 管理员操作区 */}
        {isPending && (
          <div className="paper-surface rounded-[24px] p-4 space-y-3">
            <h2 className="text-sm font-bold text-[#55616b] mb-1">管理员操作</h2>
            <p className="text-xs text-[#8c949c]">此交换正在进行中，管理员可手动修改状态。</p>
            <div className="flex gap-2">
              <button
                disabled={operating}
                onClick={() => handleStatusChange('completed')}
                onPointerDown={() => {}}
                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white active:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle size={14} />
                标记完成
              </button>
              <button
                disabled={operating}
                onClick={() => setShowFailDialog(true)}
                onPointerDown={() => {}}
                className="flex items-center gap-1 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white active:bg-red-600 disabled:opacity-50"
              >
                <AlertTriangle size={14} />
                标记失败
              </button>
              <button
                disabled={operating}
                onClick={() => handleStatusChange('cancelled')}
                onPointerDown={() => {}}
                className="flex items-center gap-1 rounded-xl bg-gray-500 px-4 py-2.5 text-xs font-semibold text-white active:bg-gray-600 disabled:opacity-50"
              >
                <XCircle size={14} />
                取消预约
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 标记失败弹窗 */}
      {showFailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowFailDialog(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#1c2d24]">标记交换失败</h3>
            <p className="mt-2 text-sm text-[#6f7f76]">物品将恢复为可预约状态，双方会收到通知。</p>
            <textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="请填写失败原因（可选）"
              className="mt-3 w-full resize-none rounded-xl bg-[#f8f2e7] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6ab62]/30"
              rows={2}
              maxLength={200}
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowFailDialog(false)}
                onPointerDown={() => {}}
                className="flex-1 rounded-xl bg-[#f3ede2] py-2.5 text-sm font-medium text-[#5e6f66] active:bg-[#e8dcc8]"
              >
                取消
              </button>
              <button
                onClick={() => { setShowFailDialog(false); handleStatusChange('failed', failReason || undefined); setFailReason(''); }}
                onPointerDown={() => {}}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white active:bg-red-600"
              >
                确认失败
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
