'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bell, MessageCircle, Settings } from 'lucide-react';

import { useApp } from '@/context/AppContext';

type Tab = 'messages' | 'notifications';

export default function MessagesPage() {
  const { getMyMessages, getItemById, currentUser, notifications, markNotificationRead } = useApp();
  const [tab, setTab] = useState<Tab>('messages');
  const messages = getMyMessages();

  const conversationMap = new Map<
    string,
    {
      itemId: string;
      lastMsg: (typeof messages)[number];
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
        otherNickname: msg.fromUserId === currentUser?.id ? msg.toNickname : msg.fromNickname,
        otherAvatar: msg.fromUserId === currentUser?.id ? msg.toAvatar : msg.fromAvatar,
        unread: unreadDelta,
      });
      return;
    }

    existing.unread += unreadDelta;
    if (new Date(msg.createdAt).getTime() >= new Date(existing.lastMsg.createdAt).getTime()) {
      existing.lastMsg = msg;
      existing.otherNickname = msg.fromUserId === currentUser?.id ? msg.toNickname : msg.fromNickname;
      existing.otherAvatar = msg.fromUserId === currentUser?.id ? msg.toAvatar : msg.fromAvatar;
    }
  });

  const conversations = Array.from(conversationMap.values()).sort(
    (a, b) => new Date(b.lastMsg.createdAt).getTime() - new Date(a.lastMsg.createdAt).getTime()
  );
  const unreadConversations = conversations.filter((conversation) => conversation.unread > 0).length;
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

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
            先去逛附近好物
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
          <div className="paper-surface overflow-hidden rounded-[32px] p-3">
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
              <div className="paper-surface rounded-[30px] px-6 py-14 text-center">
                <div className="text-5xl">💬</div>
                <p className="mt-4 text-sm font-semibold text-[#55616b]">还没有私信</p>
                <p className="mt-1 text-xs text-[#8c949c]">去首页看看附近的绘本、玩具和童车吧</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[30px] border border-[rgba(201,189,171,0.42)] bg-white/90 shadow-[0_18px_44px_rgba(176,157,135,0.08)] divide-y divide-[#f1e8db]">
                {conversations.map(({ itemId, lastMsg, otherNickname, otherAvatar, unread }) => {
                  const item = getItemById(itemId);

                  return (
                    <Link
                      key={`${itemId}_${lastMsg.id}`}
                      href={`/items/${itemId}`}
                      className="grid gap-3 px-4 py-4 transition-colors hover:bg-[#fffaf2] sm:grid-cols-[auto_minmax(0,1fr)_140px]"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f0e6] text-xl shadow-inner">
                          {otherAvatar ?? '👤'}
                        </div>
                        {unread > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold leading-none text-white">
                            {unread}
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
                    </Link>
                  );
                })}
              </div>
            )
          ) : notifications.length === 0 ? (
            <div className="paper-surface rounded-[30px] px-6 py-14 text-center">
              <div className="text-5xl">🔔</div>
              <p className="mt-4 text-sm font-semibold text-[#55616b]">暂时没有新通知</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[30px] border border-[rgba(201,189,171,0.42)] bg-white/90 shadow-[0_18px_44px_rgba(176,157,135,0.08)] divide-y divide-[#f1e8db]">
              {notifications.map((notification) => {
                const content = (
                  <>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      notification.type === 'message'
                        ? 'bg-[#edf3f8]'
                        : notification.type === 'exchange'
                        ? 'bg-[#eef6f0]'
                        : 'bg-[#fff6e8]'
                    }`}>
                      <span className="text-sm">
                        {notification.type === 'message' ? '💬' : notification.type === 'exchange' ? '🤝' : '🔔'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-[#55616b]">{notification.title}</p>
                        <span className="text-xs text-[#9b9487]">{formatTime(notification.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#7f8890]">{notification.content}</p>
                    </div>
                    {!notification.read && <div className="mt-2 h-2.5 w-2.5 rounded-full bg-[#87aa95]" />}
                  </>
                );

                if (notification.relatedItemId) {
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
                    onClick={() => {
                      if (!notification.read) {
                        void markNotificationRead(notification.id);
                      }
                    }}
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
    </div>
  );
}

function InboxStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-[24px] px-4 py-4 ${tone}`}>
      <div className="text-[11px] tracking-[0.14em] text-[#8f918e]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[#55616b]">{value}</div>
    </div>
  );
}

function formatTime(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时`;
  return `${Math.floor(diff / 86400)}天`;
}
