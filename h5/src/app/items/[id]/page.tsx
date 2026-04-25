'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Eye, Heart, MapPin, Share2 } from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { isWeChatBrowser } from '@/lib/env';
import { wechat } from '@/lib/wechat';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { CATEGORY_LABELS, CONDITION_LABELS, EXCHANGE_MODE_LABELS } from '@/types';

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const {
    getItemById,
    getUserById,
    currentUser,
    addMessage,
    createExchange,
    completeExchange,
    getExchangeByItemId,
    refreshExchange,
    loading,
  } = useApp();
  const { show } = useToast();
  const { isKeyboardOpen } = useKeyboardHeight();

  const id = params.id as string;
  const item = getItemById(id);
  const exchange = getExchangeByItemId(id) ?? null;
  const isMyItem = item?.userId === currentUser?.id;
  const isReservedByCurrentUser = exchange?.requesterId === currentUser?.id;

  const [owner, setOwner] = useState<any>(null);
  const [loadingOwner, setLoadingOwner] = useState(true);
  const [currentImg, setCurrentImg] = useState(0);
  const [msgText, setMsgText] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.favoriteCount || 0);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!item) return;

    const loadData = async () => {
      setLoadingOwner(true);
      const [user, likeRes] = await Promise.all([
        getUserById(item.userId),
        refreshExchange(item.id),
        currentUser ? api.items.getLikeStatus(item.id).catch(() => ({ data: { liked: false, favoriteCount: item.favoriteCount || 0 } })) : Promise.resolve({ data: { liked: false, favoriteCount: item.favoriteCount || 0 } }),
      ]);

      if (!cancelled) {
        setOwner(user ?? null);
        setLiked(likeRes?.data?.liked ?? false);
        setLikeCount(likeRes?.data?.favoriteCount ?? item.favoriteCount ?? 0);
        setLoadingOwner(false);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [item, getUserById, refreshExchange, currentUser]);

  if (loading || !item || loadingOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f0e5]">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🔍</div>
          <p className="text-[#8c7d63]">加载中...</p>
        </div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f0e5]">
        <div className="text-center">
          <div className="text-5xl mb-4">😵</div>
          <p className="text-[#607168]">发布者信息加载失败</p>
        </div>
      </div>
    );
  }

  const conditionInfo = CONDITION_LABELS[item.condition as keyof typeof CONDITION_LABELS];
  const modeLabels: Record<string, { bg: string; text: string; icon: string }> = {
    gift: { bg: 'bg-[#e8f5ee] text-[#3e7a58] border border-[#b8ddc9]', text: '免费赠送', icon: '🎁' },
    swap: { bg: 'bg-[#eef4f0] text-[#4a6b57] border border-[#c4d9cb]', text: '以物换物', icon: '🔄' },
    sell: { bg: 'bg-[#fdf4e3] text-[#7a5c28] border border-[#e8d4a8]', text: '¥' + item.price, icon: '💰' },
  };
  const mode = modeLabels[item.exchangeMode];

  const statusCopy =
    item.status === 'completed'
      ? '这件物品已经完成流转，目前仅保留展示记录。'
      : item.status === 'pending'
      ? (isMyItem
          ? '已有邻居发起预约，线下交接完成后可点击底部按钮确认。'
          : isReservedByCurrentUser
          ? '你已提交预约，等待物主确认交接时间。'
          : '这件物品正在和其他邻居沟通中，你仍然可以发消息排队。')
      : '当前可直接联系物主，沟通细节后发起预约。';

  const handleSendMsg = async () => {
    if (!msgText.trim() || !currentUser || !owner) return;

    setSubmitting(true);
    try {
      await addMessage({
        itemId: item.id,
        fromUserId: currentUser.id,
        toUserId: owner.id,
        content: msgText.trim(),
        read: false,
      });
      show('消息已发送！邻居会尽快回复 💬', 'success');
      setMsgSent(true);
      setMsgText('');
      setTimeout(() => setMsgSent(false), 1800);
      setTimeout(() => setShowContact(false), 1200);
    } catch {
      show('发送失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReserve = async () => {
    if (!currentUser || !owner) {
      router.push('/login');
      return;
    }

    setSubmitting(true);
    try {
      if (msgText.trim()) {
        await addMessage({
          itemId: item.id,
          fromUserId: currentUser.id,
          toUserId: owner.id,
          content: msgText.trim(),
          read: false,
        });
      }

      await createExchange({
        itemId: item.id,
        ownerId: owner.id,
        message: msgText.trim() || `想预约「${item.title}」`,
      });
      show('预约已发出，等对方确认交接 🤝', 'success');
      setMsgSent(true);
      setMsgText('');
      setShowContact(false);
      setTimeout(() => setMsgSent(false), 1800);
    } catch (error: any) {
      show(error?.message || '预约失败，请稍后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!exchange) return;

    setCompleting(true);
    try {
      await completeExchange(exchange.id);
      show('已标记为完成交接，演示数据已更新 ✅', 'success');
    } catch {
      show('操作失败，请稍后重试', 'error');
    } finally {
      setCompleting(false);
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  /** 底部主操作按钮 - 简化版，主要给物品主人用 */
  const bottomAction = () => {
    // 已完成
    if (item.status === 'completed') {
      return (
        <button disabled className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-400">
          已完成交换
        </button>
      );
    }

    // 自己的物品 - 保留完整操作
    if (isMyItem) {
      if (item.status === 'pending' && exchange?.status === 'pending') {
        return (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {completing ? '确认中...' : '✅ 确认已交接'}
          </button>
        );
      }
      return (
        <Link
          href="/profile"
          className="flex-1 rounded-2xl bg-[#eef4ef] py-3 text-center text-sm font-semibold text-[#1f3a30] active:bg-[#e1ebe2]"
        >
          📦 查看我的发布
        </Link>
      );
    }

    // 其他用户：卡片内已有联系按钮，底部无需重复显示
    return null;
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/share?itemId=${encodeURIComponent(id)}&path=${encodeURIComponent(`/items/${id}`)}&title=${encodeURIComponent(item.title)}&desc=${encodeURIComponent(`${item.location.community} · ${EXCHANGE_MODE_LABELS[item.exchangeMode]} · ${item.condition}`)}&img=${encodeURIComponent(item.images[0] || `${window.location.origin}/og-image.svg`)}`;
    const title = item.title;
    const modeLabel = EXCHANGE_MODE_LABELS[item.exchangeMode];

    // 微信浏览器内使用微信SDK
    if (isWeChatBrowser) {
      wechat.showShareMenu({
        title: `${title} — 邻里童享`,
        desc: `在${item.location.community}，${modeLabel}，${item.condition}`,
        link: shareUrl,
        imgUrl: item.images[0] || `${window.location.origin}/og-image.svg`,
      });
      return;
    }

    // 统一使用剪贴板复制（手机电脑体验一致）
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(shareUrl);
      show('链接已复制，可粘贴分享给朋友', 'info');
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (likeLoading) return;

    setLikeLoading(true);
    try {
      const res = await api.items.toggleLike(item.id);
      setLiked(res.data.liked);
      setLikeCount(res.data.favoriteCount);
    } catch {
      show('操作失败，请稍后重试', 'error');
    } finally {
      setLikeLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* 顶栏 */}
      <div className="page-shell !pt-6 !pb-0">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="secondary-button inline-flex h-11 w-11 items-center justify-center rounded-full text-[#71808b] shadow-[0_10px_22px_rgba(176,157,135,0.08)]"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${mode.bg}`}>
              {mode.icon} {mode.text}
            </div>
            <button
              onClick={handleLike}
              className={`flex h-10 items-center gap-1.5 rounded-full border px-3 shadow-[0_10px_22px_rgba(176,157,135,0.08)] active:opacity-90 ${
                liked
                  ? 'border-[#f4a0a0] bg-red-50 text-red-500'
                  : 'border-[#e8dcc8] bg-white text-[#607168]'
              }`}
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              <span className="text-xs font-medium">{likeCount}</span>
            </button>
            <button
              onPointerDown={() => {}}
              onClick={handleShare}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8dcc8] bg-white text-[#607168] shadow-[0_10px_22px_rgba(176,157,135,0.08)] active:bg-[#f8f2e7]"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="page-shell !pt-0 pb-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_420px]">
          <section className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="overflow-hidden rounded-[34px] border border-[rgba(201,189,171,0.42)] bg-[#f7efe4] shadow-[0_22px_60px_rgba(176,157,135,0.12)]">
              <div className="aspect-[4/3] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8),rgba(247,239,228,0.94))] p-3 lg:aspect-[5/4] lg:p-4">
                <img src={item.images[currentImg]} alt={item.title} className="h-full w-full rounded-[28px] bg-white object-contain" />
              </div>
            </div>

            {item.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {item.images.map((image, index) => (
                  <button
                    key={image}
                    onClick={() => setCurrentImg(index)}
                    className={`overflow-hidden rounded-[22px] border ${index === currentImg ? 'border-[#a8c3b1] ring-2 ring-[#a8c3b1]/20' : 'border-[rgba(201,189,171,0.42)]'} bg-white`}
                  >
                    <img src={image} alt={`${item.title} ${index + 1}`} className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="paper-surface rounded-[34px] p-5 sm:p-6">
              <p className="section-label">ITEM DETAILS</p>
              <h1 className="story-title mt-2 text-[28px] leading-tight text-[#4b5862] sm:text-[34px]">{item.title}</h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#eef6f0] px-3 py-1.5 text-xs font-medium text-[#7a9986]">
                  {CATEGORY_LABELS[item.category]}
                </span>
                {conditionInfo && (
                  <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${conditionInfo.color}`}>
                    {conditionInfo.dot} {item.condition}
                  </span>
                )}
                <span className="rounded-full bg-[#f8f3ea] px-3 py-1.5 text-xs text-[#83909a]">
                  适合 {item.ageRange === 'all' ? '所有年龄' : `${item.ageRange}岁`}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef1f7] px-3 py-1.5 text-xs text-[#8492a0]">
                  <Eye size={12} /> {item.views} 次浏览
                </span>
              </div>

              <div className={`mt-4 rounded-[24px] px-4 py-3 text-sm ${
                item.status === 'completed'
                  ? 'bg-gray-50 text-gray-600'
                  : item.status === 'pending'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {item.status === 'available' ? '🟢 可预约' : item.status === 'pending' ? '🟡 预约处理中' : '✅ 已完成'}
                <p className="mt-1 text-xs opacity-80">{statusCopy}</p>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#47574c]">{item.description}</p>

              {item.tags && item.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#f7f0e6] px-2.5 py-1 text-xs text-[#8c7d63]">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 卖家信息卡片 */}
            <div className="paper-surface rounded-[34px] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f0e6] text-2xl">
                    {owner.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#1c2d24]">{owner.nickname}</span>
                      {owner.isLiaison && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                          🌟 联络员
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#8c7d63]">
                      <span className="inline-flex items-center gap-1"><MapPin size={10} /> {item.location.community}</span>
                      {item.distance !== undefined && (
                        <span className="font-medium text-[#1f3a30]">距您 {item.distance < 0.1 ? '<100m' : `${item.distance.toFixed(1)}km`}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <span className="text-amber-500">★★★★★</span>
                    <span className="ml-0.5 text-xs text-[#8c7d63]">
                      {item.ownerCreditScore !== undefined
                        ? item.ownerCreditScore.toFixed(1)
                        : owner.creditScore}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#8c7d63]">{owner.exchangeCount} 次交换</p>
                </div>
              </div>

              {owner.badges.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#f1e8db] pt-4">
                  {owner.badges.map((badge: any) => (
                    <span key={badge.id} className={`rounded-full bg-[#f7f0e6] px-2.5 py-1 text-xs ${badge.color}`}>
                      {badge.icon} {badge.name}
                    </span>
                  ))}
                </div>
              )}

              {/* 联系按钮 - 移到卡片内更醒目 */}
              {!isMyItem && item.status !== 'completed' && (
                <div className="mt-4 border-t border-[#f1e8db] pt-4">
                  {currentUser ? (
                    <button
                      onClick={() => setShowContact(true)}
                      className="w-full rounded-2xl bg-gradient-to-r from-[#1f3a30] to-[#2d5a47] py-3.5 text-sm font-bold text-white shadow-lg active:opacity-90"
                    >
                      💬 联系 {owner.nickname}
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push('/login')}
                      className="w-full rounded-2xl bg-gradient-to-r from-[#1f3a30] to-[#2d5a47] py-3.5 text-sm font-bold text-white shadow-lg active:opacity-90"
                    >
                      🔑 登录后联系
                    </button>
                  )}
                </div>
              )}
              {isMyItem && item.status === 'available' && (
                <div className="mt-4 border-t border-[#f1e8db] pt-4">
                  <p className="text-center text-xs text-[#8c7d63]">这是你的物品</p>
                </div>
              )}
            </div>

            {/* 移动端操作栏 - 始终显示，放在卖家卡片下方 */}
            <div className="xl:hidden">{bottomAction()}</div>

            <div className="rounded-[28px] border border-[#d9e6dd] bg-gradient-to-r from-[#eef7f0] to-[#f8f0df] px-5 py-4">
              <p className="text-xs leading-relaxed text-[#5a7a68]">
                🌿 每一次以物换物，都让好物继续被需要，而不是被丢弃。感谢你的参与。
              </p>
            </div>

            <p className="pb-2 text-center text-xs text-[#8c7d63]">
              发布于 {formatDate(item.createdAt)}
            </p>
          </section>
        </div>
      </div>

      {showContact && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowContact(false)} />
          <div
            className="relative w-full rounded-t-3xl bg-[#fffaf1] p-5 transition-transform duration-200"
            style={{
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
              transform: `translateY(calc(-1 * var(--keyboard-height, 0px)))`,
            }}
          >
            <h3 className="font-bold text-base mb-1">联系 {owner.nickname}</h3>
            <p className="mb-4 text-xs text-[#8c7d63]">
              {mode.text} · {item.title}
            </p>
            <textarea
              value={msgText}
              onChange={(event) => setMsgText(event.target.value)}
              placeholder={
                item.status === 'pending' && !isReservedByCurrentUser
                  ? '可以先表达你的需求，排队等候对方回复...'
                  : '您好，这个物品还在吗？方便的话可以约时间看看...'
              }
              className="h-28 w-full resize-none rounded-xl bg-[#f7f0e6] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6ab62]/35"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => setShowContact(false)}
                className="flex-1 rounded-2xl border border-[#e8dcc8] py-3 text-sm font-medium text-[#607168]"
              >
                取消
              </button>
              <button
                onClick={() => void handleSendMsg()}
                disabled={!msgText.trim() || submitting}
                className="flex-1 rounded-2xl bg-[#eef4ef] py-3 text-sm font-bold text-[#1f3a30] disabled:opacity-50"
              >
                {submitting ? '发送中...' : '只发消息'}
              </button>
            </div>
            {!isMyItem && item.status === 'available' && (
              <button
                onClick={() => void handleReserve()}
                disabled={submitting}
                className="mt-3 w-full rounded-2xl bg-[#1f3a30] py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {submitting ? '提交中...' : '发送并预约'}
              </button>
            )}
            {!isMyItem && item.status === 'pending' && !isReservedByCurrentUser && (
              <p className="text-xs text-amber-600 mt-3 text-center">
                这件物品已经有人预约，你仍然可以先留言排队。
              </p>
            )}
          </div>
        </div>
      )}

      {msgSent && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg">
          ✅ 操作已发送！
        </div>
      )}
    </div>
  );
}
