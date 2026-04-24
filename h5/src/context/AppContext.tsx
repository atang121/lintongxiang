'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

import { api } from '@/lib/api';
import {
  normalizeExchange,
  normalizeItem,
  normalizeMessage,
  normalizeNotification,
  normalizeUser,
} from '@/lib/normalize';
import { XIANGYANG_COMMUNITIES } from '@/data/communities';
import { XIANGYANG_CENTER, calcDistanceKm } from '@/lib/tencentMap';
import { CommunityOption, Exchange, FilterState, Item, Message, Notification, OpsConfig, OpsSource, User } from '@/types';

interface AppState {
  items: Item[];
  currentUser: User | null;
  selectedCommunity: string;
  communityOptions: CommunityOption[];
  opsConfig: OpsConfig;
  opsSource: OpsSource;
  filters: FilterState;
  userLocation: { lat: number; lng: number } | null;
  notifications: Notification[];
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  getFilteredItems: () => Item[];
  getItemById: (id: string) => Item | undefined;
  getUserById: (id: string) => Promise<User | undefined>;
  addItem: (item: any) => Promise<Item>;
  addMessage: (msg: Omit<Message, 'id' | 'createdAt'>) => Promise<void>;
  getMyItems: () => Item[];
  getMyMessages: () => Message[];
  getExchangeByItemId: (itemId: string) => Exchange | null | undefined;
  unreadCount: number;
  setCurrentUser: (user: User | null) => void;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  setSelectedCommunity: (community: string) => void;
  updateUser: (data: Partial<User> & { isCustomCommunity?: boolean }) => Promise<void>;
  refreshItems: (params?: any) => Promise<void>;
  refreshMessages: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshExchange: (itemId: string) => Promise<Exchange | null>;
  createExchange: (payload: { itemId: string; ownerId: string; message?: string }) => Promise<Exchange>;
  completeExchange: (exchangeId: string) => Promise<Exchange>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  loading: boolean;
}

const defaultFilters: FilterState = {
  distance: 3,
  category: 'all',
  ageRange: 'all',
  exchangeMode: 'all',
  keyword: '',
  sortBy: 'distance',
  listingType: 'all',
};

const defaultOpsConfig: OpsConfig = {
  auth_mode: 'qq_email_code',
  require_publish_review: false,
  image_upload_provider: 'local',
  image_upload_max_count: 6,
  image_upload_max_mb: 8,
  announcement: '邻里之间轻松流转童年好物，先沟通，再约时间。',
  support_contact: 'demo@qq.com',
  qq_mail_enabled: false,
};

const defaultOpsSource: OpsSource = {
  feishu_enabled: false,
  mail_provider: 'preview',
  image_upload_provider: 'local',
  image_upload_ready: true,
};

const AppContext = createContext<AppState | null>(null);

function getStorage() {
  if (typeof window === 'undefined') return null;
  const storage = window.localStorage;
  if (
    typeof storage?.getItem !== 'function' ||
    typeof storage?.setItem !== 'function' ||
    typeof storage?.removeItem !== 'function'
  ) {
    return null;
  }
  return storage;
}

function getGuestSelectedCommunity() {
  const storage = getStorage();
  return storage?.getItem('guestSelectedCommunity') || '';
}

function itemMatchesCommunity(item: Item, communityName: string): boolean {
  if (!communityName) return false;
  const name = communityName.trim().toLowerCase();
  return (
    item.location.community?.toLowerCase() === name ||
    item.ownerCommunity?.toLowerCase() === name
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [selectedCommunity, setSelectedCommunityState] = useState<string>('');
  const [communityOptions, setCommunityOptions] = useState<CommunityOption[]>(XIANGYANG_COMMUNITIES);
  const [opsConfig, setOpsConfig] = useState<OpsConfig>(defaultOpsConfig);
  const [opsSource, setOpsSource] = useState<OpsSource>(defaultOpsSource);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [exchangeMap, setExchangeMap] = useState<Record<string, Exchange | null>>({});
  const [filters, setFiltersState] = useState<FilterState>(defaultFilters);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const setCurrentUser = useCallback((user: User | null) => {
    const storage = getStorage();
    const normalizedUser = user ? normalizeUser(user) : null;
    setCurrentUserState(normalizedUser);

    if (!storage) return;
    if (normalizedUser) {
      storage.setItem('user', JSON.stringify(normalizedUser));
      if (normalizedUser.community) {
        storage.setItem('selectedCommunity', normalizedUser.community);
        setSelectedCommunityState(normalizedUser.community);
      }
      storage.removeItem('guestSelectedCommunity');
    } else {
      storage.removeItem('user');
      storage.removeItem('token');
      storage.removeItem('selectedCommunity');
      setSelectedCommunityState(getGuestSelectedCommunity());
    }
  }, []);

  useEffect(() => {
    const storage = getStorage();
    const savedUser = storage?.getItem('user');
    const savedToken = storage?.getItem('token');
    const savedCommunity = storage?.getItem('selectedCommunity');
    const savedGuestCommunity = storage?.getItem('guestSelectedCommunity');

    if (savedUser && savedToken) {
      try {
        const user = normalizeUser(JSON.parse(savedUser));
        setCurrentUserState(user);
        setSelectedCommunityState(savedCommunity || user.community || '');
      } catch {
        storage?.removeItem('user');
      }
    } else if (savedGuestCommunity) {
      setSelectedCommunityState(savedGuestCommunity);
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nextLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(nextLocation);
        },
        () => setUserLocation(XIANGYANG_CENTER)
      );
    } else {
      setUserLocation(XIANGYANG_CENTER);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const result = await api.ops.bootstrap();
        if (!active) return;
        if (Array.isArray(result.data.communities) && result.data.communities.length > 0) {
          setCommunityOptions(result.data.communities as CommunityOption[]);
        }
        if (result.data.config) {
          setOpsConfig((prev) => ({ ...prev, ...result.data.config }));
        }
        if (result.data.source) {
          setOpsSource((prev) => ({ ...prev, ...result.data.source }));
        }
      } catch (error) {
        console.error('加载运营配置失败:', error);
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const setSelectedCommunity = useCallback((community: string) => {
    setSelectedCommunityState(community);
    const storage = getStorage();
    if (storage) {
      if (currentUser) {
        storage.setItem('selectedCommunity', community);
      } else if (community) {
        storage.setItem('guestSelectedCommunity', community);
      } else {
        storage.removeItem('guestSelectedCommunity');
      }
    }
  }, [currentUser]);

  /** 列表与距离展示的统一圆心：优先所选小区坐标，否则 GPS，再否则襄阳中心 */
  const browseAnchor = useMemo(() => {
    const name = selectedCommunity.trim();
    if (!name) return null;
    const match = communityOptions.find((c) => c.name === name);
    if (match && Number.isFinite(match.lat) && Number.isFinite(match.lng)) {
      return { lat: match.lat, lng: match.lng };
    }
    if (userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
      return { lat: userLocation.lat, lng: userLocation.lng };
    }
    return { lat: XIANGYANG_CENTER.lat, lng: XIANGYANG_CENTER.lng };
  }, [selectedCommunity, communityOptions, userLocation]);

  const refreshItems = useCallback(async (params?: any) => {
    if (!selectedCommunity.trim()) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!browseAnchor) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const radius = filters.distance > 0 ? filters.distance : 500;
      const result = await api.items.getList({
        lat: browseAnchor.lat,
        lng: browseAnchor.lng,
        radius,
        category: filters.category !== 'all' ? filters.category : undefined,
        age_range: filters.ageRange !== 'all' ? filters.ageRange : undefined,
        exchange_mode: filters.exchangeMode !== 'all' ? filters.exchangeMode : undefined,
        listing_type: filters.listingType !== 'all' ? filters.listingType : undefined,
        ...params,
      });
      setItems(result.data.map(normalizeItem));
    } catch (err) {
      console.error('加载物品失败:', err);
    } finally {
      setLoading(false);
    }
  }, [browseAnchor, selectedCommunity, filters]);

  useEffect(() => {
    setLoading(true);
    refreshItems();
  }, [refreshItems]);

  const refreshMessages = useCallback(async () => {
    if (!currentUser) {
      setMessages([]);
      return;
    }

    try {
      const result = await api.messages.getList(currentUser.id);
      setMessages(result.data.map(normalizeMessage));
    } catch (err) {
      console.error('加载消息失败:', err);
    }
  }, [currentUser]);

  const refreshNotifications = useCallback(async () => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    try {
      const result = await api.notifications.list(currentUser.id);
      setNotifications(result.data.map(normalizeNotification));
    } catch (err) {
      console.error('加载通知失败:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshMessages();
    refreshNotifications();
  }, [currentUser, refreshMessages, refreshNotifications]);

  const refreshExchange = useCallback(async (itemId: string) => {
    try {
      const result = await api.exchanges.list({ item_id: itemId });
      const exchange = result.data ? normalizeExchange(result.data) : null;
      setExchangeMap((prev) => ({ ...prev, [itemId]: exchange }));
      return exchange;
    } catch (err) {
      console.error('加载预约失败:', err);
      setExchangeMap((prev) => ({ ...prev, [itemId]: null }));
      return null;
    }
  }, []);

  const calcDistance = useCallback(
    (lat: number, lng: number) => {
      if (!browseAnchor) return 0;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 0;
      return parseFloat(calcDistanceKm(browseAnchor, { lat, lng }).toFixed(1));
    },
    [browseAnchor]
  );

  const setFilters = useCallback((partial: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => setFiltersState(defaultFilters), []);

  const getFilteredItems = useCallback(() => {
    let result = items.filter((item) => item.status !== 'deleted');

    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      result = result.filter((item) =>
        item.title.toLowerCase().includes(kw) ||
        item.description.toLowerCase().includes(kw) ||
        item.tags?.some((t) => t.toLowerCase().includes(kw))
      );
    }

    // 闲置 vs 需求 过滤
    if (filters.listingType !== 'all') {
      result = result.filter((item) => item.listingType === filters.listingType);
    }

    if (filters.category !== 'all') {
      result = result.filter((item) => item.category === filters.category);
    }

    if (filters.ageRange !== 'all') {
      result = result.filter((item) => item.ageRange === filters.ageRange);
    }

    if (filters.exchangeMode !== 'all') {
      result = result.filter((item) => item.exchangeMode === filters.exchangeMode);
    }

    return result
      .map((item) => ({
        ...item,
        distance: parseFloat(calcDistance(item.location.lat, item.location.lng).toFixed(1)),
      }))
      .sort((a, b) => {
        if (filters.sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (filters.sortBy === 'popular') {
          return b.views - a.views;
        }
        // 距离排序：优先展示同小区物品，再按距离排序
        const aIsSameCommunity = itemMatchesCommunity(a, selectedCommunity);
        const bIsSameCommunity = itemMatchesCommunity(b, selectedCommunity);
        if (aIsSameCommunity !== bIsSameCommunity) {
          return aIsSameCommunity ? -1 : 1;
        }
        const distDiff = (a.distance ?? 0) - (b.distance ?? 0);
        if (distDiff !== 0) return distDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [items, filters, calcDistance, selectedCommunity]);

  const getItemById = useCallback((id: string) => items.find((item) => item.id === id), [items]);

  const getUserById = useCallback(async (id: string) => {
    try {
      const res = await api.users.getById(id);
      return normalizeUser(res.data);
    } catch {
      return undefined;
    }
  }, []);

  const addItem = useCallback(async (itemData: any) => {
    if (!currentUser) throw new Error('请先登录');

    const result = await api.items.create({
      user_id: currentUser.id,
      title: itemData.title,
      description: itemData.description,
      images: itemData.images,
      category: itemData.category,
      age_range: itemData.ageRange ?? itemData.age_range,
      exchange_mode: itemData.exchangeMode ?? itemData.exchange_mode,
      listing_type: itemData.listingType ?? itemData.listing_type,
      price: itemData.price,
      condition: itemData.condition,
      tags: itemData.tags,
      community: itemData.location?.community ?? itemData.community ?? currentUser.community,
      district: itemData.location?.district ?? itemData.district ?? currentUser.district ?? '',
      lat: itemData.location?.lat ?? itemData.lat ?? userLocation?.lat,
      lng: itemData.location?.lng ?? itemData.lng ?? userLocation?.lng,
    });

    await refreshItems();
    return normalizeItem(result.data);
  }, [currentUser, refreshItems, userLocation]);

  const addMessage = useCallback(async (msg: Omit<Message, 'id' | 'createdAt'>) => {
    if (!currentUser) throw new Error('请先登录');

    await api.messages.send({
      item_id: msg.itemId,
      from_user_id: currentUser.id,
      to_user_id: msg.toUserId,
      content: msg.content,
    });

    await Promise.all([refreshMessages(), refreshNotifications()]);
  }, [currentUser, refreshMessages, refreshNotifications]);

  const createExchange = useCallback(async (payload: { itemId: string; ownerId: string; message?: string }) => {
    if (!currentUser) throw new Error('请先登录');

    const result = await api.exchanges.create({
      item_id: payload.itemId,
      requester_id: currentUser.id,
      owner_id: payload.ownerId,
      message: payload.message,
    });
    const exchange = normalizeExchange(result.data);

    setExchangeMap((prev) => ({ ...prev, [payload.itemId]: exchange }));
    await Promise.all([refreshItems(), refreshNotifications()]);
    return exchange;
  }, [currentUser, refreshItems, refreshNotifications]);

  const completeExchange = useCallback(async (exchangeId: string) => {
    if (!currentUser) throw new Error('请先登录');

    const result = await api.exchanges.complete(exchangeId, currentUser.id);
    const exchange = normalizeExchange(result.data);

    setExchangeMap((prev) => ({ ...prev, [exchange.itemId]: exchange }));
    await Promise.all([refreshItems(), refreshNotifications()]);
    return exchange;
  }, [currentUser, refreshItems, refreshNotifications]);

  const updateUser = useCallback(async (data: Partial<User> & { isCustomCommunity?: boolean }) => {
    if (!currentUser) throw new Error('请先登录');
    const { isCustomCommunity, ...rest } = data;
    const payload = isCustomCommunity !== undefined
      ? { ...rest, isCustomCommunity }
      : rest;
    const result = await api.users.update(currentUser.id, payload);
    setCurrentUser(normalizeUser(result.data));
  }, [currentUser, setCurrentUser]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    await api.notifications.markRead(notificationId);
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const getMyItems = useCallback(
    () => items.filter((item) => item.userId === currentUser?.id && item.status !== 'deleted'),
    [items, currentUser]
  );

  const getMyMessages = useCallback(() => {
    if (!currentUser) return [];
    return messages.filter(
      (msg) => msg.toUserId === currentUser.id || msg.fromUserId === currentUser.id
    );
  }, [messages, currentUser]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <AppContext.Provider
      value={{
        items,
        currentUser,
        selectedCommunity,
        communityOptions,
        opsConfig,
        opsSource,
        filters,
        userLocation,
        notifications,
        setFilters,
        resetFilters,
        getFilteredItems,
        getItemById,
        getUserById,
        addItem,
        addMessage,
        getMyItems,
        getMyMessages,
        getExchangeByItemId: (itemId) => exchangeMap[itemId],
        unreadCount,
        setCurrentUser,
        setUserLocation,
        setSelectedCommunity,
        updateUser,
        refreshItems,
        refreshMessages,
        refreshNotifications,
        refreshExchange,
        createExchange,
        completeExchange,
        markNotificationRead,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
