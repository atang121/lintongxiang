import { BADGE_LIBRARY } from '@/lib/badges';
import { normalizeBackendTime } from '@/lib/time';
import { SERVICE_AGREEMENT_VERSION } from '@/data/serviceAgreement';
import { Badge, Exchange, Item, ItemStatus, Message, Notification, User } from '@/types';

function normalizeAssetUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const raw = value.trim();

  if (typeof window === 'undefined') return raw;

  try {
    const url = new URL(raw, window.location.origin);
    const current = new URL(window.location.origin);

    if (url.pathname.startsWith('/uploads/')) {
      const apiPort = current.port === '3000' || current.port === '3001' ? '3001' : current.port || '';
      url.protocol = current.protocol;
      url.hostname = current.hostname === '0.0.0.0' ? '127.0.0.1' : current.hostname;
      url.port = apiPort;
      return url.toString();
    }

    if (['127.0.0.1', 'localhost', '0.0.0.0'].includes(url.hostname)) {
      url.protocol = current.protocol;
      url.hostname = current.hostname;
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBooleanFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function normalizeBadge(raw: any): Badge {
  if (!raw || typeof raw !== 'object') {
    return BADGE_LIBRARY[0];
  }

  return {
    id: String(raw.id || 'badge_fallback'),
    name: String(raw.name || '邻里徽章'),
    icon: String(raw.icon || '🌟'),
    color: String(raw.color || 'text-amber-600'),
  };
}

function normalizeStatus(value: unknown): ItemStatus {
  if (value === 'pending' || value === 'completed' || value === 'deleted') return value;
  return 'available';
}

export function normalizeUser(raw: any): User {
  const badges = parseJsonArray<any>(raw?.badges ?? raw?.badge).map(normalizeBadge);
  const rawRequired = raw?.serviceAgreementRequired ?? raw?.service_agreement_required;

  let childAgeRanges: string[] | undefined;
  try {
    const parsed = JSON.parse(String(raw?.child_age_ranges ?? raw?.childAgeRanges ?? '[]'));
    if (Array.isArray(parsed)) childAgeRanges = parsed;
  } catch {}

  return {
    id: String(raw?.id || ''),
    nickname: String(raw?.nickname || '邻居家长'),
    avatar: String(raw?.avatar || '😊'),
    community: raw?.community ? String(raw.community) : '',
    district: raw?.district ? String(raw.district) : undefined,
    email: raw?.email ? String(raw.email) : undefined,
    creditScore: toNumber(raw?.creditScore ?? raw?.credit_score, 4.8),
    exchangeCount: toNumber(raw?.exchangeCount ?? raw?.exchange_count, 0),
    badges,
    isLiaison: toBooleanFlag(raw?.isLiaison ?? raw?.is_liaison),
    isAdmin: toBooleanFlag(raw?.isAdmin ?? raw?.is_admin),
    nicknameEditsUsed: toNumber(raw?.nicknameEditsUsed ?? raw?.nickname_edits_used, 0),
    communityEditsUsed: toNumber(raw?.communityEditsUsed ?? raw?.community_edits_used, 0),
    bio: raw?.bio ? String(raw.bio) : undefined,
    phone: raw?.phone ? String(raw.phone) : undefined,
    lat: toOptionalNumber(raw?.lat),
    lng: toOptionalNumber(raw?.lng),
    childAgeRanges,
    childCount: raw?.child_count ?? raw?.childCount ? toNumber(raw?.child_count ?? raw?.childCount, 0) : undefined,
    serviceAgreementVersion: raw?.serviceAgreementVersion ?? raw?.service_agreement_version ?? '',
    serviceAgreementConfirmedAt: raw?.serviceAgreementConfirmedAt ?? raw?.service_agreement_confirmed_at ?? '',
    serviceAgreementRequired:
      rawRequired !== undefined
        ? toBooleanFlag(rawRequired)
        : String(raw?.serviceAgreementVersion ?? raw?.service_agreement_version ?? '') !== SERVICE_AGREEMENT_VERSION,
  };
}

export function normalizeItem(raw: any): Item {
  const community = raw?.location?.community ?? raw?.community ?? '';
  const district = raw?.location?.district ?? raw?.district ?? undefined;
  const lat = toNumber(raw?.location?.lat ?? raw?.lat, 32.0042);
  const lng = toNumber(raw?.location?.lng ?? raw?.lng, 112.1227);

  return {
    id: String(raw?.id || ''),
    title: String(raw?.title || '未命名物品'),
    description: String(raw?.description || ''),
    images: parseJsonArray<string>(raw?.images).map(normalizeAssetUrl).filter(Boolean),
    listingType: raw?.listingType ?? raw?.listing_type ?? 'offer',
    category: raw?.category || 'other',
    ageRange: raw?.ageRange ?? raw?.age_range ?? 'all',
    exchangeMode: raw?.exchangeMode ?? raw?.exchange_mode ?? 'gift',
    price: toOptionalNumber(raw?.price),
    priceNegotiable: raw?.priceNegotiable ?? raw?.price_negotiable ?? undefined,
    condition: raw?.condition || '正常使用',
    location: { community, district, lat, lng },
    distance: toOptionalNumber(raw?.distance),
    userId: String(raw?.userId ?? raw?.user_id ?? ''),
    status: normalizeStatus(raw?.status),
    createdAt: normalizeBackendTime(raw?.createdAt ?? raw?.created_at),
    deleteReason: raw?.deleteReason ?? raw?.delete_reason ?? undefined,
    deletedBy: raw?.deletedBy ?? raw?.deleted_by ?? undefined,
    deletedAt: raw?.deletedAt || raw?.deleted_at ? normalizeBackendTime(raw?.deletedAt ?? raw?.deleted_at) : undefined,
    views: toNumber(raw?.views ?? raw?.view_count, 0),
    tags: parseJsonArray<string>(raw?.tags),
    ownerName: raw?.ownerName ?? raw?.owner_name,
    ownerAvatar: raw?.ownerAvatar ?? raw?.owner_avatar,
    ownerCommunity: raw?.ownerCommunity ?? raw?.owner_community,
    ownerCredit: toOptionalNumber(raw?.ownerCredit ?? raw?.owner_credit),
    ownerCreditScore: Math.min(5, Math.max(0, toNumber(raw?.ownerCredit ?? raw?.owner_credit, 0))),
  };
}

export function normalizeMessage(raw: any): Message {
  return {
    id: String(raw?.id || ''),
    itemId: String(raw?.itemId ?? raw?.item_id ?? ''),
    fromUserId: String(raw?.fromUserId ?? raw?.from_user_id ?? ''),
    toUserId: String(raw?.toUserId ?? raw?.to_user_id ?? ''),
    content: String(raw?.content || ''),
    createdAt: normalizeBackendTime(raw?.createdAt ?? raw?.created_at),
    read: toBooleanFlag(raw?.read),
    fromNickname: raw?.fromNickname ?? raw?.from_nickname,
    fromAvatar: raw?.fromAvatar ?? raw?.from_avatar,
    toNickname: raw?.toNickname ?? raw?.to_nickname,
    toAvatar: raw?.toAvatar ?? raw?.to_avatar,
    itemTitle: raw?.itemTitle ?? raw?.item_title,
    itemImages: parseJsonArray<string>(raw?.itemImages ?? raw?.item_images),
    partnerId: raw?.partnerId ?? raw?.partner_id,
    unread: toOptionalNumber(raw?.unread),
  };
}

export function normalizeNotification(raw: any): Notification {
  return {
    id: String(raw?.id || ''),
    type: raw?.type || 'system',
    title: String(raw?.title || '系统通知'),
    content: String(raw?.content || ''),
    createdAt: normalizeBackendTime(raw?.createdAt ?? raw?.created_at),
    read: toBooleanFlag(raw?.read),
    userId: raw?.userId ?? raw?.user_id,
    relatedItemId: raw?.relatedItemId ?? raw?.related_item_id,
  };
}

export function normalizeExchange(raw: any): Exchange {
  const status = raw?.status;
  const normalizedStatus = ['pending', 'waiting', 'completed', 'cancelled', 'failed', 'expired'].includes(status)
    ? status
    : 'pending';
  return {
    id: String(raw?.id || ''),
    itemId: String(raw?.itemId ?? raw?.item_id ?? ''),
    requesterId: String(raw?.requesterId ?? raw?.requester_id ?? ''),
    ownerId: String(raw?.ownerId ?? raw?.owner_id ?? ''),
    status: normalizedStatus,
    message: raw?.message ? String(raw.message) : undefined,
    createdAt: normalizeBackendTime(raw?.createdAt ?? raw?.created_at),
    updatedAt: raw?.updated_at || raw?.updatedAt ? normalizeBackendTime(raw?.updatedAt ?? raw?.updated_at) : undefined,
    completedAt: raw?.completed_at || raw?.completedAt ? normalizeBackendTime(raw?.completedAt ?? raw?.completed_at) : undefined,
    cancelledBy: raw?.cancelled_by || raw?.cancelledBy || undefined,
    cancelledAt: raw?.cancelled_at || raw?.cancelledAt ? normalizeBackendTime(raw?.cancelledAt ?? raw?.cancelled_at) : undefined,
    failedAt: raw?.failed_at || raw?.failedAt ? normalizeBackendTime(raw?.failedAt ?? raw?.failed_at) : undefined,
    failReason: raw?.fail_reason || raw?.failReason || undefined,
    queuePosition: toOptionalNumber(raw?.queuePosition ?? raw?.queue_position),
    activeUntil: raw?.active_until || raw?.activeUntil ? normalizeBackendTime(raw?.activeUntil ?? raw?.active_until) : undefined,
    promotedAt: raw?.promoted_at || raw?.promotedAt ? normalizeBackendTime(raw?.promotedAt ?? raw?.promoted_at) : undefined,
    reminderSentAt: raw?.reminder_sent_at || raw?.reminderSentAt ? normalizeBackendTime(raw?.reminderSentAt ?? raw?.reminder_sent_at) : undefined,
    expiredAt: raw?.expired_at || raw?.expiredAt ? normalizeBackendTime(raw?.expiredAt ?? raw?.expired_at) : undefined,
  };
}
