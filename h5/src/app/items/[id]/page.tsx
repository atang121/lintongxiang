'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Copy, Edit3, Eye, Heart, MapPin, MessageCircle, RotateCcw, Send, Share2, Trash2, X } from 'lucide-react';

import ItemImageCarousel from '@/components/ItemImageCarousel';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { isWeChatBrowser } from '@/lib/env';
import { normalizeItem } from '@/lib/normalize';
import { toTimeMs } from '@/lib/time';
import { getTrustLevel } from '@/lib/trustLevel';
import { wechat } from '@/lib/wechat';
import { CATEGORY_LABELS, CONDITION_LABELS, EXCHANGE_MODE_LABELS, getPriceNegotiableLabel, Item } from '@/types';

function getItemClosingNote(item: Item) {
  if (item.listingType === 'wanted') {
    return [
      '说出你的小需求，让邻里来搭把手。',
      '每一次回应，都是社区里的守望相助，让需要的人更快找到温暖的答案。',
    ];
  }

  if (item.exchangeMode === 'sell') {
    return [
      '每一次当面交接，都是闲置好物的温暖接力。',
      '让孩子的绘本、玩具、衣物，继续在邻里间传递快乐～',
    ];
  }

  if (item.exchangeMode === 'swap') {
    return [
      '用孩子的闲置，换一份邻里的小惊喜。',
      '每一次交换，不仅让好物继续发光，更让孩子学会分享与珍惜。',
    ];
  }

  return [
    '把孩子用不上的好物，送给更需要的邻居。',
    '每一次无偿分享，都是邻里间最温柔的善意，让温暖在社区里传递。',
  ];
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const {
    getItemById,
    getUserById,
    currentUser,
    addMessage,
    getMyMessages,
    createExchange,
    completeExchange,
    cancelExchange,
    failExchange,
    getExchangeByItemId,
    refreshExchange,
    refreshItems,
    refreshMessages,
    loading,
  } = useApp();
  const { show } = useToast();

  const id = params.id as string;
  const contextItem = getItemById(id);
  const [fallbackItem, setFallbackItem] = useState<Item | null>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loadingOwner, setLoadingOwner] = useState(true);
  const [loadingItem, setLoadingItem] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showShareGuide, setShowShareGuide] = useState(false);
  const [activeInterestKey, setActiveInterestKey] = useState<string | null>(null);
  const [interestReplyText, setInterestReplyText] = useState('');
  const [interestReplying, setInterestReplying] = useState(false);
  const [ownerActioning, setOwnerActioning] = useState(false);

  const item = contextItem ?? fallbackItem;
  const exchange = getExchangeByItemId(id) ?? null;
  const isMyItem = item?.userId === currentUser?.id;
  const isReservedByCurrentUser = exchange?.requesterId === currentUser?.id;
  const hasEndedMyExchange = isReservedByCurrentUser && ['cancelled', 'failed', 'expired'].includes(String(exchange?.status));
  const myMessages = getMyMessages();

  useEffect(() => {
    if (contextItem || !id) return;

    let cancelled = false;

    const loadItem = async () => {
      setLoadingItem(true);
      try {
        const result = await api.items.getById(id);
        if (!cancelled) setFallbackItem(normalizeItem(result.data));
      } catch {
        if (!cancelled) setFallbackItem(null);
      } finally {
        if (!cancelled) setLoadingItem(false);
      }
    };

    void loadItem();

    return () => {
      cancelled = true;
    };
  }, [contextItem, id]);

  useEffect(() => {
    let cancelled = false;

    if (!item) return;

    const loadData = async () => {
      setLoadingOwner(true);
      const [user] = await Promise.all([
        getUserById(item.userId),
        refreshExchange(item.id),
        refreshMessages(),
      ]);

      if (!cancelled) {
        setOwner(user ?? null);
        setLoadingOwner(false);
      }

      // 记录浏览行为（不阻塞 UI，静默失败）
      api.behavior.recordView({
        item_id: item.id,
        category: item.category,
        age_range: item.ageRange,
      }).catch(() => {});
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [item, getUserById, refreshExchange, refreshMessages]);

  useEffect(() => {
    if (!item || !currentUser || item.userId !== currentUser.id) return;

    const refreshItemConversations = () => {
      void refreshMessages();
      void refreshExchange(item.id);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshItemConversations();
      }
    };

    refreshItemConversations();
    const timer = window.setInterval(refreshItemConversations, 8000);
    window.addEventListener('focus', refreshItemConversations);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshItemConversations);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [item, currentUser, refreshExchange, refreshMessages]);

  if (loadingItem || loading || !item || loadingOwner) {
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
  const priceNote = item.exchangeMode === 'sell' ? getPriceNegotiableLabel(item.priceNegotiable, item.listingType) : '';
  const modeLabels: Record<string, { bg: string; text: string; icon: string }> = {
    gift: { bg: 'bg-[#e8f5ee] text-[#3e7a58] border border-[#b8ddc9]', text: '免费赠送', icon: '🎁' },
    swap: { bg: 'bg-[#eef4f0] text-[#4a6b57] border border-[#c4d9cb]', text: '以物换物', icon: '🔄' },
    sell: {
      bg: 'bg-[#fdf4e3] text-[#7a5c28] border border-[#e8d4a8]',
      text: item.price
        ? `${item.listingType === 'wanted' ? '预算 ' : ''}¥${item.price}${priceNote ? ` · ${priceNote}` : ''}`
        : (item.listingType === 'wanted' ? '愿意购买' : '定价出售'),
      icon: '💰',
    },
  };
  const mode = modeLabels[item.exchangeMode];
  const ownerTrustLevel = getTrustLevel(owner.exchangeCount);
  const interestMap = new Map<
    string,
    {
      otherUserId: string;
      otherNickname?: string;
      otherAvatar?: string;
      messages: typeof myMessages;
      firstAt: string;
      lastMsg: (typeof myMessages)[number];
      unread: number;
    }
  >();

  myMessages
    .filter((message) => message.itemId === item.id)
    .forEach((message) => {
      const otherUserId = message.fromUserId === currentUser?.id ? message.toUserId : message.fromUserId;
      if (!otherUserId || otherUserId === currentUser?.id) return;

      const existing = interestMap.get(otherUserId);
      const otherNickname = message.fromUserId === currentUser?.id ? message.toNickname : message.fromNickname;
      const otherAvatar = message.fromUserId === currentUser?.id ? message.toAvatar : message.fromAvatar;
      const unreadDelta = message.toUserId === currentUser?.id && !message.read ? 1 : 0;

      if (!existing) {
        interestMap.set(otherUserId, {
          otherUserId,
          otherNickname,
          otherAvatar,
          messages: [message],
          firstAt: message.createdAt,
          lastMsg: message,
          unread: unreadDelta,
        });
        return;
      }

      existing.messages.push(message);
      existing.unread += unreadDelta;
      if (toTimeMs(message.createdAt) < toTimeMs(existing.firstAt)) {
        existing.firstAt = message.createdAt;
      }
      if (toTimeMs(message.createdAt) >= toTimeMs(existing.lastMsg.createdAt)) {
        existing.lastMsg = message;
        existing.otherNickname = otherNickname;
        existing.otherAvatar = otherAvatar;
      }
    });

  const interestConversations = Array.from(interestMap.values())
    .sort((a, b) => toTimeMs(a.firstAt) - toTimeMs(b.firstAt))
    .map((conversation) => ({
      ...conversation,
      messages: conversation.messages.sort(
        (a, b) => toTimeMs(a.createdAt) - toTimeMs(b.createdAt)
      ),
    }));
  const activeInterestConversation = interestConversations.find(
    (conversation) => conversation.otherUserId === activeInterestKey
  );
  const currentInterestUserId =
    exchange?.status === 'pending' && exchange.requesterId
      ? exchange.requesterId
      : interestConversations[0]?.otherUserId;
  const standbyInterestUserIds = interestConversations
    .map((conversation) => conversation.otherUserId)
    .filter((userId) => userId !== currentInterestUserId);
  const deleteReason = String(item.deleteReason || '').trim();
  const isPublisherDeleted =
    item.status === 'deleted'
    && (deleteReason === '发布者主动下架'
      || item.deletedBy === item.userId
      || (!deleteReason && (!item.deletedBy || item.deletedBy === item.userId)));
  const isAccountDeleted = item.status === 'deleted' && deleteReason.includes('注销账号');
  const isPlatformDeleted = item.status === 'deleted' && !isPublisherDeleted && !isAccountDeleted;
  const canRelistDeletedItem = item.status === 'deleted' && isMyItem && isPublisherDeleted;
  const deletedStatusTitle = isPlatformDeleted ? '平台已下架' : isAccountDeleted ? '账号注销下架' : '已下架';

  const statusCopy =
    item.status === 'completed'
      ? '这件物品已经完成流转，目前仅保留展示记录。'
      : item.status === 'deleted'
      ? isPlatformDeleted
        ? `平台已下架这条内容${deleteReason ? `。原因：${deleteReason}` : '，暂不继续展示'}。`
        : isAccountDeleted
        ? '发布者账号已注销，系统已自动下架这条内容。'
        : '发布者已下架这条内容，其他用户不会继续看到。'
      : exchange?.status === 'cancelled' && isReservedByCurrentUser
      ? '你之前取消过这次预约，如仍有需要，可以重新预约或加入候补。'
      : exchange?.status === 'failed' && isReservedByCurrentUser
      ? '这次沟通未能完成，如双方重新确认，也可以再次发起预约。'
      : exchange?.status === 'expired' && isReservedByCurrentUser
      ? '上次预约已超时释放，如仍有需要，可以重新预约或加入候补。'
      : item.status === 'pending'
      ? (isMyItem
          ? '已有邻居发起预约，线下交接完成后可点击底部按钮确认。'
          : exchange?.status === 'waiting'
          ? `你已进入候补队列${exchange.queuePosition ? `，当前第 ${exchange.queuePosition} 位` : ''}，轮到你时会收到提醒。`
          : isReservedByCurrentUser
          ? '你已提交预约，等待物主确认交接时间。'
          : '这件物品正在和其他邻居沟通中，你可以发送并加入候补队列。')
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
    } catch (err: any) {
      if (err?.isSensitiveError) {
        const words = err.sensitive_words || [];
        show(`⚠️ 私信内容包含敏感词（${words.join('、')}），请修改后重新发送`, 'error');
      } else {
        show('发送失败，请重试', 'error');
      }
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

      const createdExchange = await createExchange({
        itemId: item.id,
        ownerId: owner.id,
        message: msgText.trim() || `想预约「${item.title}」`,
      });
      show(
        createdExchange.status === 'waiting'
          ? `已加入候补队列${createdExchange.queuePosition ? `，当前第 ${createdExchange.queuePosition} 位` : ''} ⏳`
          : '预约已发出，等对方确认交接 🤝',
        'success'
      );
      setMsgSent(true);
      setMsgText('');
      setShowContact(false);
      setTimeout(() => setMsgSent(false), 1800);
    } catch (error: any) {
      if (error?.isSensitiveError) {
        const words = error.sensitive_words || [];
        show(`⚠️ 私信内容包含敏感词（${words.join('、')}），请修改后重新发送`, 'error');
      } else {
        show(error?.message || '预约失败，请稍后重试', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!exchange) return;

    setCompleting(true);
    try {
      await completeExchange(exchange.id);
      show('已确认交接完成 ✅', 'success');
    } catch {
      show('操作失败，请稍后重试', 'error');
    } finally {
      setCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!exchange) return;

    setSubmitting(true);
    try {
      await cancelExchange(exchange.id);
      show('预约已取消，物品已恢复可预约 🔄', 'success');
    } catch (err: any) {
      show(err?.message || '取消失败，请稍后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFail = async () => {
    if (!exchange) return;

    setSubmitting(true);
    try {
      await failExchange(exchange.id);
      show('已记录未能成交，物品已恢复可预约 🔄', 'success');
    } catch (err: any) {
      show(err?.message || '操作失败，请稍后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownShelf = async () => {
    if (!isMyItem) return;

    setOwnerActioning(true);
    try {
      await api.items.delete(item.id);
      await refreshItems();
      const result = await api.items.getById(item.id);
      setFallbackItem(normalizeItem(result.data));
      show('已下架，其他用户不会再看到这条发布', 'success');
    } catch (err: any) {
      show(err?.message || '下架失败，请稍后重试', 'error');
    } finally {
      setOwnerActioning(false);
    }
  };

  const handleRelist = async () => {
    if (!isMyItem) return;

    setOwnerActioning(true);
    try {
      await api.items.relist(item.id);
      await refreshItems();
      const result = await api.items.getById(item.id);
      setFallbackItem(normalizeItem(result.data));
      show('已重新发布', 'success');
    } catch (err: any) {
      show(err?.message || '重新发布失败，请稍后重试', 'error');
    } finally {
      setOwnerActioning(false);
    }
  };

  const handleRemindOwnerToConfirm = async () => {
    if (!currentUser || !owner || !exchange) return;

    setSubmitting(true);
    try {
      await addMessage({
        itemId: item.id,
        fromUserId: currentUser.id,
        toUserId: owner.id,
        content: '我已取到，请确认交接。',
        read: false,
      });
      show('已提醒发布者确认交接 💬', 'success');
      setMsgSent(true);
      setTimeout(() => setMsgSent(false), 1800);
    } catch (err: any) {
      show(err?.message || '提醒发送失败，请稍后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openInterestConversation = async (conversation: (typeof interestConversations)[number]) => {
    setActiveInterestKey(conversation.otherUserId);
    setInterestReplyText('');

    const unreadIncoming = conversation.messages.filter(
      (message) => message.toUserId === currentUser?.id && !message.read
    );
    if (unreadIncoming.length === 0) return;

    await Promise.allSettled(unreadIncoming.map((message) => api.messages.markRead(message.id)));
    await refreshMessages();
  };

  const replyToInterest = async () => {
    if (!currentUser || !activeInterestConversation || !interestReplyText.trim()) return;

    setInterestReplying(true);
    try {
      await addMessage({
        itemId: item.id,
        fromUserId: currentUser.id,
        toUserId: activeInterestConversation.otherUserId,
        content: interestReplyText.trim(),
        read: false,
      });
      setInterestReplyText('');
      show('回复已发送，仅对方可见 💬', 'success');
    } catch (err: any) {
      show(err?.message || '回复失败，请稍后重试', 'error');
    } finally {
      setInterestReplying(false);
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(toTimeMs(iso));
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getShareUrl = () =>
    `${window.location.origin}/share?itemId=${encodeURIComponent(id)}&path=${encodeURIComponent(`/items/${id}`)}&title=${encodeURIComponent(item.title)}&desc=${encodeURIComponent(`${item.location.community} · ${EXCHANGE_MODE_LABELS[item.exchangeMode]} · ${item.condition}`)}&img=${encodeURIComponent(item.images[0] || `${window.location.origin}/og-image.svg`)}`;

  const handleFavorite = () => {
    setLiked((value) => {
      const next = !value;
      if (next) {
        show('已收藏，稍后可以从我的页面继续查看', 'success');
      } else {
        show('已取消收藏', 'info');
      }
      return next;
    });
  };

  const copyShareLink = async () => {
    const shareUrl = getShareUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        show('链接已复制，可粘贴分享给邻居', 'success');
        setShowShareGuide(false);
      } else {
        setShowShareGuide(true);
      }
    } catch {
      setShowShareGuide(true);
    }
  };

  /** 底部主操作按钮 */
  const bottomAction = () => {
    // 已完成
    if (item.status === 'completed') {
      return (
        <button disabled className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-400">
          已完成交换
        </button>
      );
    }

    if (item.status === 'deleted') {
      if (canRelistDeletedItem) {
        return (
          <button
            onClick={() => void handleRelist()}
            disabled={ownerActioning}
            className="flex-1 rounded-2xl bg-[#1f3a30] py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {ownerActioning ? '处理中...' : '重新发布'}
          </button>
        );
      }
      return (
        <button disabled className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-400">
          {isMyItem && isPlatformDeleted ? '平台已下架' : '已下架'}
        </button>
      );
    }

    // 自己的物品
    if (isMyItem) {
      if (item.status === 'pending' && exchange?.status === 'pending') {
        return (
          <div className="flex gap-2 w-full">
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {completing ? '确认中...' : '✅ 确认已交接'}
            </button>
            <button
              onClick={() => void handleFail()}
              disabled={completing}
              className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 disabled:opacity-50"
            >
              未能成交
            </button>
          </div>
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

    // 未登录 → 弹出登录提示
    if (!currentUser) {
      return (
        <button
          onClick={() => router.push('/login')}
          onPointerDown={() => {}}
          className="flex-1 rounded-2xl bg-[#1f3a30] py-3 text-sm font-bold text-white active:bg-[#173026]"
        >
          🔑 登录后联系物主
        </button>
      );
    }

    // 预约者 - pending 状态可取消
    if (isReservedByCurrentUser && exchange?.status === 'pending') {
      return (
        <div className="grid w-full grid-cols-3 gap-2">
          <button
            onClick={() => setShowContact(true)}
            aria-label="联系发布者"
            className="rounded-2xl bg-[#1f3a30] px-3 py-3 text-sm font-bold text-white active:bg-[#173026]"
          >
            联系
          </button>
          <button
            onClick={() => void handleCancel()}
            disabled={submitting}
            className="rounded-2xl bg-gray-100 px-3 py-3 text-sm font-medium text-gray-600 disabled:opacity-50"
          >
            取消预约
          </button>
          <button
            onClick={() => void handleRemindOwnerToConfirm()}
            aria-label="提醒发布者确认"
            disabled={submitting}
            className="rounded-2xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700 disabled:opacity-50"
          >
            提醒确认
          </button>
        </div>
      );
    }

    if (isReservedByCurrentUser && exchange?.status === 'waiting') {
      return (
        <div className="grid w-full grid-cols-[minmax(0,1fr)_112px] gap-2">
          <button
            onClick={() => setShowContact(true)}
            aria-label="联系发布者"
            className="rounded-2xl bg-[#fff3dc] px-3 py-3 text-sm font-bold text-[#7a5c28] active:bg-[#fde8bd]"
          >
            候补中{exchange.queuePosition ? ` · 第 ${exchange.queuePosition} 位` : ''}
          </button>
          <button
            onClick={() => void handleCancel()}
            disabled={submitting}
            className="rounded-2xl bg-gray-100 px-3 py-3 text-sm font-medium text-gray-600 disabled:opacity-50"
          >
            取消候补
          </button>
        </div>
      );
    }

    // 可联系
    const btnLabel = hasEndedMyExchange
      ? item.status === 'pending'
        ? '💬 重新预约并候补'
        : '💬 重新预约'
      : item.status === 'pending' && !isReservedByCurrentUser
      ? '💬 联系并候补'
      : '💬 联系并预约';

    return (
      <button
        onClick={() => setShowContact(true)}
        onPointerDown={() => {}}
        className="flex-1 rounded-2xl bg-[#1f3a30] py-3 text-sm font-bold text-white active:bg-[#173026]"
      >
        {btnLabel}
      </button>
    );
  };

  const handleShare = () => {
    const shareUrl = getShareUrl();
    const title = item.title;
    const modeLabel = EXCHANGE_MODE_LABELS[item.exchangeMode];

    if (isWeChatBrowser) {
      wechat.showShareMenu({
        title: `${title} — 童邻市集`,
        desc: `在${item.location.community}，${modeLabel}，${item.condition}`,
        link: shareUrl,
        imgUrl: item.images[0] || `${window.location.origin}/og-image.svg`,
      });
      setShowShareGuide(true);
      show('已准备好分享内容，请点右上角菜单发送给邻居', 'info');
    } else if (navigator.share) {
      void navigator.share({
        title: `${title} - 童邻市集`,
        text: `${item.location.community} · ${modeLabel} · ${item.condition}`,
        url: shareUrl,
      }).catch((error) => {
        if (error?.name !== 'AbortError') setShowShareGuide(true);
      });
    } else {
      void copyShareLink();
    }
  };

  return (
    <div className="min-h-screen pb-[calc(104px+env(safe-area-inset-bottom))] xl:pb-10">
      <div className="page-shell !pt-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="secondary-button inline-flex h-11 w-11 items-center justify-center rounded-full text-[#71808b] shadow-[0_10px_22px_rgba(176,157,135,0.08)]"
          >
            <ChevronLeft size={20} />
          </button>
          <div className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${mode.bg}`}>
            {mode.icon} {mode.text}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_420px]">
          <section className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <ItemImageCarousel item={item} />
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
                {priceNote && (
                  <span className="rounded-full bg-[#fff3df] px-3 py-1.5 text-xs font-semibold text-[#9a7b48]">
                    {priceNote}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef1f7] px-3 py-1.5 text-xs text-[#8492a0]">
                  <Eye size={12} /> {item.views} 次浏览
                </span>
              </div>

              <div className={`mt-4 rounded-[24px] px-4 py-3 text-sm ${
                item.status === 'completed'
                  ? 'bg-gray-50 text-gray-600'
                  : item.status === 'deleted'
                  ? 'bg-gray-50 text-gray-600'
                  : exchange?.status === 'cancelled' && isReservedByCurrentUser
                  ? 'bg-gray-50 text-gray-600'
                  : exchange?.status === 'failed' && isReservedByCurrentUser
                  ? 'bg-red-50 text-red-700'
                  : item.status === 'pending'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {item.status === 'available' ? '🟢 可预约' : item.status === 'deleted' ? `⚪ ${deletedStatusTitle}` : exchange?.status === 'cancelled' && isReservedByCurrentUser ? '⚪ 上次预约已取消' : exchange?.status === 'failed' && isReservedByCurrentUser ? '🔴 上次未成交' : exchange?.status === 'expired' && isReservedByCurrentUser ? '⚪ 上次预约已释放' : item.status === 'pending' ? '🟡 预约处理中' : '✅ 已完成'}
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

            {isMyItem && (
              <div className="rounded-[28px] border border-[#eadfca] bg-white/92 p-4 shadow-[0_18px_50px_rgba(55,88,71,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="section-label">OWNER TOOLS</p>
                    <h2 className="mt-1 text-base font-bold text-[#344238]">发布管理</h2>
                    <p className="mt-1 text-xs leading-5 text-[#8c949c]">
                      内容有变化可以编辑后重新发布；不想继续流转时先下架，保留记录方便以后再发布。
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    item.status === 'deleted'
                      ? 'bg-gray-100 text-gray-500'
                      : item.status === 'pending'
                      ? 'bg-[#fff3dc] text-[#8a6a35]'
                      : item.status === 'completed'
                      ? 'bg-[#eef1f7] text-[#667482]'
                      : 'bg-[#e8f5ee] text-[#3e7a58]'
                  }`}>
                    {item.status === 'deleted' ? deletedStatusTitle : item.status === 'pending' ? '预约中' : item.status === 'completed' ? '已完成' : '展示中'}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/publish?edit=${item.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#eef4ef] px-3 py-3 text-sm font-bold text-[#1f3a30]"
                  >
                    <Edit3 size={16} />
                    编辑后发布
                  </Link>
                  {item.status === 'deleted' ? (
                    canRelistDeletedItem ? (
                    <button
                      type="button"
                      onClick={() => void handleRelist()}
                      disabled={ownerActioning}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#1f3a30] px-3 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      {ownerActioning ? '处理中' : '重新发布'}
                    </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-3 text-sm font-bold text-gray-400"
                      >
                        {isPlatformDeleted ? '平台已下架' : '不可重新发布'}
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleDownShelf()}
                      disabled={ownerActioning || item.status === 'completed'}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#fff1ec] px-3 py-3 text-sm font-bold text-[#b85b44] disabled:opacity-45"
                    >
                      <Trash2 size={16} />
                      {ownerActioning ? '处理中' : '下架'}
                    </button>
                  )}
                </div>
              </div>
            )}

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
                  <div className={`inline-flex items-center justify-end gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${ownerTrustLevel.tone}`}>
                    <span>{ownerTrustLevel.icon}</span>
                    <span>{ownerTrustLevel.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#8c7d63]">{owner.exchangeCount} 次完成交换</p>
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
            </div>

            {isMyItem && (
              <div className="paper-surface rounded-[30px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="section-label">INTERESTS</p>
                    <h2 className="story-title mt-1 text-[24px] text-[#4b5862]">预约与留言</h2>
                    <p className="mt-1 text-xs leading-5 text-[#8c949c]">
                      按最早留言时间展示；当前预约优先处理，未成交或取消后再联系下一位候补。
                    </p>
                  </div>
                  {interestConversations.length > 0 && (
                    <span className="rounded-full bg-[#eef6f0] px-3 py-1 text-xs font-semibold text-[#5f806f]">
                      {interestConversations.length} 位邻居
                    </span>
                  )}
                </div>

                {interestConversations.length === 0 ? (
                  <div className="mt-4 rounded-[22px] border border-dashed border-[#e8dcc8] bg-[#fffaf2] px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-[#607168]">还没有邻居留言</p>
                    <p className="mt-1 text-xs text-[#9b9487]">有人感兴趣后，你可以在这里直接回复。</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {interestConversations.map((conversation) => {
                      const isCurrent = conversation.otherUserId === currentInterestUserId;
                      const standbyIndex = standbyInterestUserIds.indexOf(conversation.otherUserId) + 1;
                      const statusLabel = isCurrent ? '当前预约' : `候补第 ${standbyIndex} 位`;

                      return (
                        <button
                          key={conversation.otherUserId}
                          onClick={() => void openInterestConversation(conversation)}
                          className="flex w-full items-center gap-3 rounded-[22px] border border-[#f0e5d4] bg-white/82 px-3 py-3 text-left transition-colors hover:bg-[#fffaf2]"
                        >
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f7f0e6] text-xl">
                            {conversation.otherAvatar || '👤'}
                            {conversation.unread > 0 && (
                              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                                {conversation.unread}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-bold text-[#52606a]">
                                {conversation.otherNickname || '邻居家长'}
                              </p>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                isCurrent ? 'bg-[#e8f5ee] text-[#3e7a58]' : 'bg-[#fff3dc] text-[#8a6a35]'
                              }`}>
                                {statusLabel}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-1 text-xs text-[#7f8890]">
                              {conversation.lastMsg.fromUserId === currentUser?.id ? '我：' : ''}
                              {conversation.lastMsg.content}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#eef4ef] px-3 py-1.5 text-xs font-semibold text-[#1f3a30]">
                            回复
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="paper-surface hidden rounded-[34px] p-5 xl:block">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleFavorite}
                  aria-label={liked ? '取消收藏' : '收藏物品'}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors hover:bg-[#f8f2e7] ${
                    liked ? 'border-[#e7b5a4] bg-[#fff1ec] text-[#c75d46]' : 'border-[#e8dcc8] text-[#607168]'
                  }`}
                >
                  <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={handleShare}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e8dcc8] text-[#607168] transition-colors hover:bg-[#f8f2e7]"
                >
                  <Share2 size={20} />
                </button>
                <div className="flex-1">{bottomAction()}</div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#d9e6dd] bg-gradient-to-r from-[#eef7f0] to-[#f8f0df] px-5 py-4">
              <div className="space-y-1 text-xs leading-relaxed text-[#5a7a68]">
                {getItemClosingNote(item).map((line) => (
                  <p key={line}>🌿 {line}</p>
                ))}
              </div>
            </div>

            <p className="pb-2 text-center text-xs text-[#8c7d63]">
              发布于 {formatDate(item.createdAt)}
            </p>
          </section>
        </div>
      </div>

      {!showContact && !showShareGuide && !activeInterestConversation && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[70] border-t border-[#e8dcc8] bg-[rgba(255,255,255,0.96)] px-4 py-3 backdrop-blur-xl xl:hidden"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-2xl gap-3">
            <button
              onClick={handleFavorite}
              aria-label={liked ? '取消收藏' : '收藏物品'}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors active:bg-[#f8f2e7] ${
                liked ? 'border-[#e7b5a4] bg-[#fff1ec] text-[#c75d46]' : 'border-[#e8dcc8] text-[#607168]'
              }`}
            >
              <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleShare}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e8dcc8] text-[#607168] transition-colors active:bg-[#f8f2e7]"
            >
              <Share2 size={20} />
            </button>
            {bottomAction()}
          </div>
        </div>
      )}

      {showContact && (
        <div className="fixed inset-0 z-[90] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowContact(false)} />
          <div className="relative w-full rounded-t-[30px] bg-[#fffaf1] p-5 shadow-[0_-24px_70px_rgba(51,43,34,0.22)]" style={{ paddingBottom: 'max(22px, env(safe-area-inset-bottom))' }}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#344238]">联系 {owner.nickname}</h3>
                <p className="mt-1 text-xs text-[#8c7d63]">
                  {mode.text} · {item.title}
                </p>
              </div>
              <button
                onClick={() => setShowContact(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#8c7d63]"
                aria-label="关闭联系面板"
              >
                <X size={18} />
              </button>
            </div>
            <textarea
              value={msgText}
              onChange={(event) => setMsgText(event.target.value)}
              placeholder={
                item.status === 'pending' && (!isReservedByCurrentUser || hasEndedMyExchange)
                  ? '可以先表达你的需求，排队等候对方回复...'
                  : '您好，这个物品还在吗？方便的话可以约时间看看...'
              }
              className="h-28 w-full resize-none rounded-xl bg-[#f7f0e6] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6ab62]/35"
            />
            {!isMyItem && (item.status === 'available' || item.status === 'pending') && (!isReservedByCurrentUser || hasEndedMyExchange) && (
              <button
                onClick={() => void handleReserve()}
                disabled={submitting}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1f3a30] py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <Send size={16} />
                {submitting ? '提交中...' : hasEndedMyExchange ? (item.status === 'pending' ? '发送并重新候补' : '发送并重新预约') : item.status === 'pending' ? '发送并候补' : '发送并预约'}
              </button>
            )}
            <div className="mt-3 flex gap-3">
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
              <p className="mt-3 text-center text-xs text-[#8c7d63]">
                发送后发布者会收到预约通知，线下面交完成后由发布者确认。
              </p>
            )}
            {!isMyItem && item.status === 'pending' && (!isReservedByCurrentUser || hasEndedMyExchange) && (
              <p className="text-xs text-amber-600 mt-3 text-center">
                这件物品已有当前预约，提交后会按时间进入候补队列，轮到你时自动提醒。
              </p>
            )}
            {!isMyItem && (
              <p className="mt-3 rounded-2xl bg-white/70 px-3 py-2 text-center text-xs leading-5 text-[#8c7d63]">
                平台仅提供邻里信息展示、沟通与预约工具；不参与交易、不提供担保，物品验收、付款、交付及售后由双方自行确认并承担相应风险。
              </p>
            )}
          </div>
        </div>
      )}

      {activeInterestConversation && (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/40">
          <div className="relative flex max-h-[86vh] w-full flex-col rounded-t-[30px] bg-[#fffaf1] shadow-[0_-24px_70px_rgba(51,43,34,0.22)]">
            <div className="flex items-start justify-between gap-3 border-b border-[#f1e8db] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                  {activeInterestConversation.otherAvatar || '👤'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#344238]">
                    {activeInterestConversation.otherNickname || '邻居家长'}
                  </p>
                  <p className="mt-0.5 text-xs text-[#8c7d63]">关于「{item.title}」的留言</p>
                </div>
              </div>
              <button
                onClick={() => setActiveInterestKey(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#8c7d63]"
                aria-label="关闭留言回复"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {activeInterestConversation.messages.map((message) => {
                const mine = message.fromUserId === currentUser?.id;
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                      mine
                        ? 'bg-[#1f3a30] text-white'
                        : 'bg-white text-[#56656f] shadow-[0_10px_24px_rgba(176,157,135,0.08)]'
                    }`}>
                      <p>{message.content}</p>
                      <p className={`mt-1 text-[10px] ${mine ? 'text-white/65' : 'text-[#9b9487]'}`}>
                        {formatDate(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#f1e8db] bg-[#fffdf8] px-4 py-3" style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>
              <p className="mb-2 text-xs text-[#8c7d63]">该回复仅你和留言者可见，不会展示给其他候补邻居。</p>
              <div className="flex gap-2">
                <input
                  value={interestReplyText}
                  onChange={(event) => setInterestReplyText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void replyToInterest();
                    }
                  }}
                  placeholder="写下回复"
                  className="min-w-0 flex-1 rounded-2xl border border-[#e8dcc8] bg-[#f7f0e6] px-4 py-3 text-sm outline-none focus:border-[#87aa95]"
                />
                <button
                  onClick={() => void replyToInterest()}
                  disabled={!interestReplyText.trim() || interestReplying}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1f3a30] px-4 py-3 text-sm font-bold text-white disabled:opacity-45"
                >
                  <Send size={16} />
                  回复
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareGuide && (
        <div className="fixed inset-0 z-[90] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowShareGuide(false)} />
          <div className="relative w-full rounded-t-[30px] bg-[#fffaf1] p-5 shadow-[0_-24px_70px_rgba(51,43,34,0.22)]" style={{ paddingBottom: 'max(22px, env(safe-area-inset-bottom))' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#344238]">分享给邻居</h3>
                <p className="mt-1 text-xs leading-5 text-[#8c7d63]">
                  微信内可点右上角菜单发送给朋友；也可以复制链接发到群里。
                </p>
              </div>
              <button
                onClick={() => setShowShareGuide(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#8c7d63]"
                aria-label="关闭分享提示"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => void copyShareLink()}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#1f3a30] py-3 text-sm font-bold text-white"
              >
                <Copy size={16} /> 复制链接
              </button>
              <button
                onClick={() => setShowShareGuide(false)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#e8dcc8] bg-white/75 py-3 text-sm font-semibold text-[#607168]"
              >
                <MessageCircle size={16} /> 我知道了
              </button>
            </div>
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
