'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bell, ChevronLeft, Clock3, MessageCircle, RotateCcw, Send, Settings, ShieldCheck, X } from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { normalizeItem } from '@/lib/normalize';
import { formatRelativeTime, toTimeMs } from '@/lib/time';
import { Item } from '@/types';

type Tab = 'messages' | 'notifications';

export default function MessagesPage() {
  const {
    getMyMessages,
    getItemById,
    currentUser,
    notifications,
    addMessage,
    refreshMessages,
    createExchange,
    cancelExchange,
    getExchangeByItemId,
    refreshExchange,
    markNotificationRead,
  } = useApp();
  const { show } = useToast();
  const [tab, setTab] = useState<Tab>('messages');
  const [activeConversationKey, setActiveConversationKey] = useState<string | null>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [exchangeActioning, setExchangeActioning] = useState(false);
  const [conversationItems, setConversationItems] = useState<Record<string, Item>>({});
  const messages = getMyMessages();

  const conversationMap = new Map<
    string,
    {
      itemId: string;
      lastMsg: (typeof messages)[number];
      messages: (typeof messages);
      otherUserId: string;
      otherNickname?: string;
      otherAvatar?: string;
      unread: number;
    }
  >();

  messages.forEach((msg) => {
    const otherUserId = msg.fromUserId === currentUser?.id ? msg.toUserId : msg.fromUserId;
    const key = `${msg.itemId}_${otherUserId}`;
    const existing = conversationMap.get(key);
    const unreadDelta = msg.toUserId === currentUser?.id && !msg.read ? 1 : 0;

    if (!existing) {
      conversationMap.set(key, {
        itemId: msg.itemId,
        lastMsg: msg,
        messages: [msg],
        otherUserId,
        otherNickname: msg.fromUserId === currentUser?.id ? msg.toNickname : msg.fromNickname,
        otherAvatar: msg.fromUserId === currentUser?.id ? msg.toAvatar : msg.fromAvatar,
        unread: unreadDelta,
      });
      return;
    }

    existing.messages.push(msg);
    existing.unread += unreadDelta;
    if (toTimeMs(msg.createdAt) >= toTimeMs(existing.lastMsg.createdAt)) {
      existing.lastMsg = msg;
      existing.otherNickname = msg.fromUserId === currentUser?.id ? msg.toNickname : msg.fromNickname;
      existing.otherAvatar = msg.fromUserId === currentUser?.id ? msg.toAvatar : msg.fromAvatar;
    }
  });

  const conversations = Array.from(conversationMap.values()).sort(
    (a, b) => toTimeMs(b.lastMsg.createdAt) - toTimeMs(a.lastMsg.createdAt)
  ).map((conversation) => ({
    ...conversation,
    messages: conversation.messages.sort(
      (a, b) => toTimeMs(a.createdAt) - toTimeMs(b.createdAt)
    ),
  }));
  const getConversationItem = (itemId: string) => getItemById(itemId) ?? conversationItems[itemId];
  const activeConversation = conversations.find(
    (conversation) => `${conversation.itemId}_${conversation.otherUserId}` === activeConversationKey
  );
  const activeItem = activeConversation ? getConversationItem(activeConversation.itemId) : undefined;
  const activeExchange = activeConversation ? getExchangeByItemId(activeConversation.itemId) : null;
  const isActiveItemOwner = activeItem?.userId === currentUser?.id;
  const isActiveRequester = activeExchange?.requesterId === currentUser?.id;
  const serviceNotifications = notifications.filter((notification) => notification.type !== 'message');
  const unreadConversations = conversations.filter((conversation) => conversation.unread > 0).length;
  const unreadNotifications = serviceNotifications.filter((notification) => !notification.read).length;

  const handleNotificationClick = async (notification: (typeof serviceNotifications)[number]) => {
    setSelectedNotificationId((current) => current === notification.id ? null : notification.id);
    if (!notification.read) {
      await markNotificationRead(notification.id).catch((error) => {
        console.warn('[messages] mark notification read failed', error);
      });
    }
  };

  const openConversation = async (conversation: (typeof conversations)[number]) => {
    setActiveConversationKey(`${conversation.itemId}_${conversation.otherUserId}`);
    setReplyText('');
    if (!getConversationItem(conversation.itemId)) {
      api.items.getById(conversation.itemId)
        .then((result) => {
          setConversationItems((prev) => ({ ...prev, [conversation.itemId]: normalizeItem(result.data) }));
        })
        .catch((error) => {
          console.warn('[messages] load conversation item failed', error);
        });
    }
    await refreshExchange(conversation.itemId);

    const unreadIncoming = conversation.messages.filter(
      (message) => message.toUserId === currentUser?.id && !message.read
    );
    if (unreadIncoming.length === 0) return;

    await Promise.allSettled(unreadIncoming.map((message) => api.messages.markRead(message.id)));
    await refreshMessages();
  };

  const handleReply = async () => {
    if (!currentUser || !activeConversation || !replyText.trim()) return;

    setReplying(true);
    try {
      await addMessage({
        itemId: activeConversation.itemId,
        fromUserId: currentUser.id,
        toUserId: activeConversation.otherUserId,
        content: replyText.trim(),
        read: false,
      });
      setReplyText('');
    } finally {
      setReplying(false);
    }
  };

  const getConversationExchangeAction = (item?: Item) => {
    if (!item) return null;
    if (item.status === 'deleted') {
      return { label: '已下架', disabled: true, tone: 'muted' as const, action: 'none' as const };
    }
    if (item.status === 'completed') {
      return { label: '已完成', disabled: true, tone: 'muted' as const, action: 'none' as const };
    }
    if (isActiveItemOwner) {
      return null;
    }
    if (isActiveRequester && activeExchange?.status === 'pending') {
      return { label: '取消预约', disabled: false, tone: 'secondary' as const, action: 'cancel' as const };
    }
    if (isActiveRequester && activeExchange?.status === 'waiting') {
      return { label: activeExchange.queuePosition ? `候补第 ${activeExchange.queuePosition} 位` : '候补中', disabled: false, tone: 'secondary' as const, action: 'cancel' as const };
    }
    if (item.status === 'pending') {
      return { label: '加入候补', disabled: false, tone: 'primary' as const, action: 'reserve' as const };
    }
    return { label: isActiveRequester && ['cancelled', 'failed', 'expired'].includes(String(activeExchange?.status)) ? '重新预约' : '预约这件', disabled: false, tone: 'primary' as const, action: 'reserve' as const };
  };

  const handleConversationExchangeAction = async () => {
    if (!activeConversation || !activeItem || !currentUser || exchangeActioning) return;
    const action = getConversationExchangeAction(activeItem);
    if (!action || action.disabled) return;

    setExchangeActioning(true);
    try {
      if (action.action === 'cancel') {
        if (!activeExchange) return;
        await cancelExchange(activeExchange.id);
        await refreshExchange(activeConversation.itemId);
        show(activeExchange.status === 'waiting' ? '已取消候补' : '已取消预约', 'success');
        return;
      }

      const exchange = await createExchange({
        itemId: activeConversation.itemId,
        ownerId: activeItem.userId,
        message: `我想预约「${activeItem.title}」，我们可以再确认一下交接时间。`,
      });
      await refreshExchange(activeConversation.itemId);
      show(
        exchange.status === 'waiting'
          ? `已加入候补队列${exchange.queuePosition ? `，当前第 ${exchange.queuePosition} 位` : ''}`
          : '预约已发出，等待发布者确认',
        'success'
      );
    } catch (error: any) {
      show(error?.message || '操作失败，请稍后重试', 'error');
    } finally {
      setExchangeActioning(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen">
        <div className="page-shell flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#f0e8db] text-4xl">
            💬
          </div>
          <h1 className="story-title mt-5 text-[26px] text-[#4b4138]">登录后联系邻居</h1>
          <p className="mt-2 text-sm text-[#8c8f94]">看到合适的物品，先聊聊再约时间</p>
          <Link href="/login" className="primary-button mt-6 inline-flex rounded-full px-8 py-3 text-sm font-semibold">
            登录 / 注册
          </Link>
          <Link href="/" className="mt-4 text-xs text-[#9da3a8] underline underline-offset-2">
            先去逛同片区好物
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="page-shell">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="story-title text-[28px] text-[#51443a]">消息</h1>
            {(unreadConversations > 0 || unreadNotifications > 0) && (
              <p className="mt-1 text-sm text-[#8b9198]">
                {unreadConversations > 0 ? `${unreadConversations} 条未读私信` : ''}
                {unreadConversations > 0 && unreadNotifications > 0 ? ' · ' : ''}
                {unreadNotifications > 0 ? `${unreadNotifications} 条未读通知` : ''}
              </p>
            )}
          </div>
          <Link href="/profile/settings" className="secondary-button inline-flex h-10 w-10 items-center justify-center rounded-full">
            <Settings size={18} className="text-[#5d6b63]" />
          </Link>
        </div>

        <section className="mt-5">
          <div className="paper-surface overflow-hidden rounded-[26px] p-2.5">
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'messages', label: '私信', icon: MessageCircle, count: unreadConversations },
                { key: 'notifications', label: '通知', icon: Bell, count: unreadNotifications },
              ].map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => setTab(key as Tab)}
                  className={`flex items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-sm font-semibold transition-colors ${
                    tab === key ? 'bg-[#f6efe0] text-[#5f806f]' : 'bg-transparent text-[#8b9198]'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                  {count > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e4b8aa] px-1 text-[10px] font-bold leading-none text-white">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4">
          {tab === 'messages' ? (
            conversations.length === 0 ? (
              <div className="paper-surface rounded-[26px] px-6 py-12 text-center">
                <div className="text-5xl">💬</div>
                <p className="mt-4 text-sm font-semibold text-[#55616b]">还没有私信</p>
                <p className="mt-1 text-xs text-[#8c949c]">去首页看看同片区的绘本、玩具和童车吧</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link href="/" className="primary-button rounded-full px-4 py-2.5 text-sm font-semibold">
                    去逛市集
                  </Link>
                  <Link href="/publish?type=wanted" className="secondary-button rounded-full px-4 py-2.5 text-sm font-semibold">
                    发布需求
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[26px] border border-[rgba(201,189,171,0.42)] bg-white/90 shadow-[0_18px_44px_rgba(176,157,135,0.08)] divide-y divide-[#f1e8db]">
                {conversations.map((conversation) => {
                  const { itemId, lastMsg, otherNickname, otherAvatar, unread } = conversation;
                  const item = getConversationItem(itemId);

                  return (
                    <button
                      key={`${itemId}_${conversation.otherUserId}`}
                      onClick={() => void openConversation(conversation)}
                      className="grid w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#fffaf2] sm:grid-cols-[auto_minmax(0,1fr)_140px]"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f0e6] text-xl shadow-inner">
                          {otherAvatar ?? '👤'}
                        </div>
                        {unread > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-[0_4px_10px_rgba(239,68,68,0.25)]">
                            {unread > 99 ? '99+' : unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[#55616b]">{otherNickname || '邻居家长'}</div>
                            <div className="mt-1 text-xs text-[#9b9487]">{formatTime(lastMsg.createdAt)}</div>
                          </div>
                            <div className="rounded-full bg-[#f8f2e7] px-2.5 py-1 text-[11px] text-[#907f68]">
                              {lastMsg.fromUserId === currentUser.id ? '我发出' : '对方发来'}
                          </div>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#71808b]">
                          {lastMsg.fromUserId === currentUser.id ? '我：' : ''}{lastMsg.content}
                        </p>
                        <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5f806f]">
                          回复
                          <span aria-hidden="true">→</span>
                        </p>
                      </div>

                      {(item || lastMsg.itemTitle) && (
                        <div className="flex items-center gap-2 rounded-[18px] bg-[#faf4ea] px-3 py-3">
                          {item?.images?.[0] ? (
                            <img src={item.images[0]} alt={item.title} className="h-11 w-11 rounded-xl object-cover" />
                          ) : (
                            <div className="h-11 w-11 rounded-xl bg-[#e8dcc8]" />
                          )}
                          <div className="min-w-0">
                            <div className="line-clamp-1 text-xs font-semibold text-[#5b6770]">{item?.title || lastMsg.itemTitle}</div>
                            <div className="mt-1 text-[11px] text-[#9b9487]">{item?.location.community || '查看物品详情'}</div>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : serviceNotifications.length === 0 ? (
            <div className="paper-surface rounded-[26px] px-6 py-12 text-center">
              <div className="text-5xl">🔔</div>
              <p className="mt-4 text-sm font-semibold text-[#55616b]">暂时没有新通知</p>
              <p className="mt-1 text-xs text-[#8c949c]">私信会集中显示在左侧“私信”里</p>
              <Link href="/" className="secondary-button mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold">
                回首页看看
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[26px] border border-[rgba(201,189,171,0.42)] bg-white/90 shadow-[0_18px_44px_rgba(176,157,135,0.08)] divide-y divide-[#f1e8db]">
              {serviceNotifications.map((notification) => {
                const isFeedbackReply = notification.type === 'feedback';
                const selected = selectedNotificationId === notification.id;
                const content = (
                  <>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isFeedbackReply
                        ? 'bg-[#eef6f0] text-[#3d6b57]'
                        : notification.type === 'message'
                        ? 'bg-[#edf3f8]'
                        : notification.type === 'exchange'
                        ? 'bg-[#eef6f0]'
                        : 'bg-[#fff6e8]'
                    }`}>
                      {isFeedbackReply ? (
                        <ShieldCheck size={17} />
                      ) : (
                        <span className="text-sm">
                          {notification.type === 'message' ? '💬' : notification.type === 'exchange' ? '🤝' : '🔔'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {isFeedbackReply && (
                            <span className="feedback_reply_notice mb-1 inline-flex rounded-full bg-[#eef6f0] px-2 py-0.5 text-[10px] font-bold text-[#3d6b57]">
                              平台反馈回复
                            </span>
                          )}
                          <p className="text-sm font-semibold text-[#55616b]">{notification.title}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${notification.read ? 'bg-[#f3ede2] text-[#9b9487]' : 'bg-[#eef6f0] text-[#3d6b57]'}`}>
                            {notification.read ? '已读' : '未读'}
                          </span>
                          <span className="text-xs text-[#9b9487]">{formatTime(notification.createdAt)}</span>
                        </div>
                      </div>
                      {!selected && (
                        <p className={`mt-1 text-sm leading-6 ${isFeedbackReply ? 'rounded-2xl bg-[#f4faf5] px-3 py-2 text-[#3d5c4a]' : 'text-[#7f8890]'}`}>
                          {notification.content}
                        </p>
                      )}
                      {selected && (
                        <div className="notification_detail_panel mt-3 rounded-2xl border border-[#dceade] bg-[#fbfffb] px-3 py-3">
                          <div className="text-[11px] font-bold text-[#3d6b57]">
                            {isFeedbackReply ? '完整回复' : '通知详情'}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#344238]">
                            {notification.content}
                          </p>
                          <p className="mt-2 text-[11px] text-[#9b9487]">
                            点击通知后已自动标记为已读
                          </p>
                        </div>
                      )}
                    </div>
                    {!notification.read && <div className="mt-2 h-2.5 w-2.5 rounded-full bg-[#87aa95]" />}
                  </>
                );

                if (notification.relatedItemId && !isFeedbackReply) {
                  return (
                    <Link
                      key={notification.id}
                      href={`/items/${notification.relatedItemId}`}
                      onClick={() => {
                        if (!notification.read) {
                          void markNotificationRead(notification.id);
                        }
                      }}
                      className={`flex items-start gap-3 px-4 py-4 transition-colors hover:bg-[#fffaf2] ${notification.read ? 'opacity-65' : ''}`}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={notification.id}
                    onClick={() => void handleNotificationClick(notification)}
                    className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-[#fffaf2] ${notification.read ? 'opacity-65' : ''}`}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {activeConversation && (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/40">
          <div className="relative flex max-h-[86vh] w-full flex-col rounded-t-[26px] bg-[#fffaf1] shadow-[0_-24px_70px_rgba(51,43,34,0.22)]">
            <div className="flex items-center gap-3 border-b border-[#f1e8db] px-4 py-3">
              <button
                onClick={() => setActiveConversationKey(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#6f7f76]"
                aria-label="返回私信列表"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#344238]">{activeConversation.otherNickname || '邻居家长'}</p>
                <p className="mt-0.5 truncate text-xs text-[#8c7d63]">
                  关于 {getConversationItem(activeConversation.itemId)?.title || activeConversation.lastMsg.itemTitle || '这件物品'}
                </p>
              </div>
              <Link
                href={`/items/${activeConversation.itemId}`}
                className="rounded-full bg-[#eef4ef] px-3 py-1.5 text-xs font-semibold text-[#1f3a30]"
              >
                看物品
              </Link>
              <button
                onClick={() => setActiveConversationKey(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#6f7f76]"
                aria-label="关闭对话"
              >
                <X size={18} />
              </button>
            </div>

            {activeItem && !isActiveItemOwner && (
              <div className="border-b border-[#f1e8db] bg-[#fffdf8] px-4 py-3">
                <div className="flex items-center gap-2 rounded-[20px] bg-[#f8f2e7] p-2">
                  {activeItem.images?.[0] ? (
                    <img src={activeItem.images[0]} alt={activeItem.title} className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8dcc8] text-lg">📦</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-bold text-[#53615a]">{activeItem.title}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#8c7d63]">
                      <Clock3 size={11} />
                      {activeItem.status === 'pending' ? '当前有人预约，可候补' : activeItem.status === 'available' ? '当前可预约' : activeItem.status === 'completed' ? '已完成' : '已下架'}
                    </p>
                  </div>
                  {(() => {
                    const action = getConversationExchangeAction(activeItem);
                    if (!action) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => void handleConversationExchangeAction()}
                        disabled={action.disabled || exchangeActioning}
                        className={`inline-flex min-w-[86px] shrink-0 items-center justify-center gap-1 rounded-2xl px-3 py-2 text-xs font-bold disabled:opacity-50 ${
                          action.tone === 'primary'
                            ? 'bg-[#1f3a30] text-white'
                            : action.tone === 'secondary'
                            ? 'bg-white text-[#6f7f76]'
                            : 'bg-white/70 text-[#9b9487]'
                        }`}
                      >
                        {action.action === 'reserve' && <Send size={13} />}
                        {action.action === 'cancel' && <RotateCcw size={13} />}
                        {exchangeActioning ? '处理中' : action.label}
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {activeConversation.messages.map((message) => {
                const mine = message.fromUserId === currentUser.id;
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                      mine
                        ? 'bg-[#1f3a30] text-white'
                        : 'bg-white text-[#56656f] shadow-[0_10px_24px_rgba(176,157,135,0.08)]'
                    }`}>
                      <p>{message.content}</p>
                      <p className={`mt-1 text-[10px] ${mine ? 'text-white/65' : 'text-[#9b9487]'}`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#f1e8db] bg-[#fffdf8] px-4 py-3" style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>
              <div className="flex gap-2">
                <input
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void handleReply();
                    }
                  }}
                  placeholder="写下回复"
                  className="min-w-0 flex-1 rounded-2xl border border-[#e8dcc8] bg-[#f7f0e6] px-4 py-3 text-sm outline-none focus:border-[#87aa95]"
                />
                <button
                  onClick={() => void handleReply()}
                  disabled={!replyText.trim() || replying}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1f3a30] px-4 py-3 text-sm font-bold text-white disabled:opacity-45"
                >
                  <Send size={16} />
                  发送回复
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  return formatRelativeTime(iso);
}
