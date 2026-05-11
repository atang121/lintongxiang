'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, ChevronLeft, Clock3, Inbox, RefreshCw, RotateCcw, Trash2, Users, BarChart3, FileText, Shield, ShieldAlert, Search, VolumeX, Volume2, UserX, UserCheck, ArrowLeftRight, Plus, X, MessageSquare, Send } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { api } from '@/lib/api';
import { DEFAULT_DEMO_ADMIN_TOKEN } from '@/lib/admin';
import { getTrustLevel } from '@/lib/trustLevel';

type AdminTab = 'content' | 'users' | 'stats' | 'exchanges' | 'feedback' | 'sensitive' | 'agreement';

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
  delete_reason?: string;
  deleted_at?: string;
};

type AdminUser = {
  id: string;
  nickname: string;
  phone: string;
  community: string;
  is_admin: number;
  is_liaison: number;
  credit_score: number;
  exchange_count: number;
  status: string;
  status_reason: string;
  status_updated_at: string;
  created_at: string;
};

// 用户状态标签
const USER_STATUS_LABEL: Record<string, string> = {
  active: '正常',
  muted: '禁言',
  deactivated: '注销',
};
const USER_STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  muted: 'bg-amber-100 text-amber-700',
  deactivated: 'bg-red-100 text-red-600',
};

type StatsData = {
  users: { total: number; newToday: number };
  items: { total: number; active: number; newToday: number };
  exchanges: { total: number; completed: number; pending: number; cancelled: number; failed: number };
  pendingReviews: number;
};

type AgreementData = {
  version: string;
  note?: string;
  published_at?: string;
  documents: {
    'user-service-agreement'?: {
      title: string;
      summary?: string;
      paragraphs: string[];
    };
  };
};

type FeedbackEntry = {
  id: string;
  user_id?: string;
  user_email?: string;
  type: string;
  content: string;
  contact?: string;
  provider?: string;
  status: string;
  admin_reply?: string;
  replied_by?: string;
  replied_at?: string;
  handled_at?: string;
  created_at: string;
  user_nickname?: string;
  user_community?: string;
  user_phone?: string;
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

const FEEDBACK_STATUS_LABEL: Record<string, string> = {
  submitted: '待处理',
  processing: '处理中',
  replied: '已回复',
  closed: '已关闭',
};

const FEEDBACK_STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  replied: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const FEEDBACK_QUICK_REPLIES = [
  '已收到，我们会核实处理。',
  '正在处理，请留意后续通知。',
  '感谢提醒，相关内容已记录并会尽快查看。',
  '该问题已处理，感谢反馈。',
];

export default function AdminPage() {
  const { currentUser, communityOptions } = useApp();
  const { show } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>('content');

  // ===== 内容管理 =====
  const [items, setItems] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [operating, setOperating] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; title: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // 发布通知
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifType, setNotifType] = useState('platform');
  const [notifAudience, setNotifAudience] = useState<'all' | 'community' | 'users'>('all');
  const [notifCommunity, setNotifCommunity] = useState('');
  const [notifUserKeyword, setNotifUserKeyword] = useState('');
  const [notifUserCommunityFilter, setNotifUserCommunityFilter] = useState('all');
  const [notifCandidateUsers, setNotifCandidateUsers] = useState<AdminUser[]>([]);
  const [notifSelectedUsers, setNotifSelectedUsers] = useState<AdminUser[]>([]);
  const [notifUserSearching, setNotifUserSearching] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // ===== 用户管理 =====
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userKeyword, setUserKeyword] = useState('');
  const [userOperating, setUserOperating] = useState<string | null>(null);
  const [userActionDialog, setUserActionDialog] = useState<{
    userId: string;
    nickname: string;
    action: 'mute' | 'unmute' | 'deactivate' | 'reactivate' | 'setAdmin' | 'removeAdmin';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');

  // ===== 数据统计 =====
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ===== 交换管理 =====
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [exchangesLoading, setExchangesLoading] = useState(false);
  const [exchangeFilter, setExchangeFilter] = useState('all');
  const [exchangeTotal, setExchangeTotal] = useState(0);

  // ===== 反馈处理 =====
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackReplyText, setFeedbackReplyText] = useState<Record<string, string>>({});
  const [feedbackOperating, setFeedbackOperating] = useState<string | null>(null);

  // ===== 敏感词管理 =====
  const [sensitiveWords, setSensitiveWords] = useState<Array<Record<string, string>>>([]);
  const [sensitiveLoading, setSensitiveLoading] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newWordCategory, setNewWordCategory] = useState('other');
  const [addingWord, setAddingWord] = useState(false);
  const [deletingWord, setDeletingWord] = useState<string | null>(null);

  // ===== 协议管理 =====
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [agreementSaving, setAgreementSaving] = useState(false);
  const [agreementExtracting, setAgreementExtracting] = useState(false);
  const [agreementTitle, setAgreementTitle] = useState('用户服务协议');
  const [agreementVersion, setAgreementVersion] = useState('');
  const [agreementNote, setAgreementNote] = useState('');
  const [agreementText, setAgreementText] = useState('');

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

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.admin.getUsers({
        keyword: userKeyword || undefined,
        limit: 100,
      });
      setUsers(res.data as AdminUser[]);
    } catch {
      show('加载用户列表失败', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.admin.getStats();
      setStats(res.data as StatsData);
    } catch {
      show('加载统计数据失败', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchExchanges = async () => {
    setExchangesLoading(true);
    try {
      const res = await api.admin.getExchanges({
        status: exchangeFilter !== 'all' ? exchangeFilter : undefined,
        limit: 100,
      });
      setExchanges(res.data as any[]);
      setExchangeTotal(res.total || 0);
    } catch {
      show('加载交换列表失败', 'error');
    } finally {
      setExchangesLoading(false);
    }
  };

  const fetchFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const res = await api.admin.getFeedback({
        status: feedbackFilter !== 'all' ? feedbackFilter : undefined,
        limit: 100,
      });
      setFeedbackEntries(res.data as FeedbackEntry[]);
      setFeedbackTotal(res.total || 0);
    } catch {
      show('加载反馈列表失败', 'error');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const fetchSensitiveWords = async () => {
    setSensitiveLoading(true);
    try {
      const res = await api.admin.getSensitiveWords();
      setSensitiveWords(res.data as Array<Record<string, string>>);
    } catch {
      show('加载敏感词列表失败', 'error');
    } finally {
      setSensitiveLoading(false);
    }
  };

  const applyAgreementData = (data: AgreementData) => {
    const doc = data.documents?.['user-service-agreement'];
    setAgreement(data);
    setAgreementTitle(doc?.title || '用户服务协议');
    setAgreementVersion(data.version || new Date().toISOString().slice(0, 10));
    setAgreementNote(data.note || '');
    setAgreementText((doc?.paragraphs || []).join('\n'));
  };

  const fetchAgreement = async () => {
    setAgreementLoading(true);
    try {
      const res = await api.admin.getServiceAgreement();
      applyAgreementData(res.data as AgreementData);
    } catch {
      show('加载协议内容失败', 'error');
    } finally {
      setAgreementLoading(false);
    }
  };

  const searchNotificationUsers = async () => {
    setNotifUserSearching(true);
    try {
      const res = await api.admin.getUsers({
        limit: 200,
      });
      setNotifCandidateUsers(res.data as AdminUser[]);
    } catch {
      show('搜索用户失败', 'error');
    } finally {
      setNotifUserSearching(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    if (!isAdmin) { router.replace('/'); return; }
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, filterStatus]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'users') return;
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'stats') return;
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'exchanges') return;
    fetchExchanges();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, exchangeFilter]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'feedback') return;
    fetchFeedback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, feedbackFilter]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'sensitive') return;
    fetchSensitiveWords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'agreement') return;
    fetchAgreement();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!notifCommunity && communityOptions.length > 0) {
      setNotifCommunity(communityOptions[0].name);
    }
  }, [communityOptions, notifCommunity]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'content' || notifAudience !== 'users' || notifCandidateUsers.length > 0) return;
    searchNotificationUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, notifAudience]);

  // ===== 内容管理操作 =====
  const handleDelete = (id: string, title: string) => {
    setDeleteReason('');
    setConfirmDialog({ id, title });
  };

  const confirmDelete = async () => {
    if (!confirmDialog) return;
    const reason = deleteReason.trim();
    if (!reason) {
      show('请填写删除原因，系统会同步通知发布者', 'error');
      return;
    }
    const { id } = confirmDialog;
    setOperating(id);
    try {
      await api.admin.deleteItem(id, reason);
      show('已删除，并已通知发布者', 'success');
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, status: 'deleted', delete_reason: reason } : item));
      setConfirmDialog(null);
      setDeleteReason('');
    } catch (error: any) {
      show(error?.message || '删除失败', 'error');
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

  const toggleNotificationUser = (user: AdminUser) => {
    setNotifSelectedUsers((prev) => (
      prev.some((item) => item.id === user.id)
        ? prev.filter((item) => item.id !== user.id)
        : [...prev, user]
    ));
  };

  const addNotificationUsers = (usersToAdd: AdminUser[]) => {
    setNotifSelectedUsers((prev) => {
      const byId = new Map(prev.map((user) => [user.id, user]));
      usersToAdd.forEach((user) => byId.set(user.id, user));
      return Array.from(byId.values());
    });
  };

  const handleBroadcast = async () => {
    if (!notifTitle.trim() || !notifContent.trim()) {
      show('请填写标题和内容', 'error');
      return;
    }
    if (notifAudience === 'community' && !notifCommunity) {
      show('请选择要推送的小区', 'error');
      return;
    }
    if (notifAudience === 'users' && notifSelectedUsers.length === 0) {
      show('请选择要推送的用户', 'error');
      return;
    }
    setBroadcasting(true);
    try {
      const result = await api.admin.broadcastNotification(
        {
          title: notifTitle.trim(),
          content: notifContent.trim(),
          type: notifType,
          audience: notifAudience,
          community: notifAudience === 'community' ? notifCommunity : undefined,
          user_ids: notifAudience === 'users' ? notifSelectedUsers.map((user) => user.id) : undefined,
        },
        DEFAULT_DEMO_ADMIN_TOKEN
      );
      show(`通知已发送给 ${result.data.sent_count} 位用户`, 'success');
      setNotifTitle('');
      setNotifContent('');
      if (notifAudience === 'users') setNotifSelectedUsers([]);
    } catch (err: any) {
      show(err?.message || '发送失败', 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  // ===== 用户管理操作 =====

  const handleUserAction = async () => {
    if (!userActionDialog) return;
    const { userId, action } = userActionDialog;
    setUserActionDialog(null);
    setUserOperating(userId);

    try {
      if (action === 'setAdmin') {
        await api.admin.setAdmin(userId, true);
        show('已设为管理员', 'success');
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_admin: 1 } : u));
      } else if (action === 'removeAdmin') {
        await api.admin.setAdmin(userId, false);
        show('已取消管理员', 'success');
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_admin: 0 } : u));
      } else {
        let status = '';
        if (action === 'mute') status = 'muted';
        else if (action === 'unmute') status = 'active';
        else if (action === 'deactivate') status = 'deactivated';
        else if (action === 'reactivate') status = 'active';

        await api.admin.setUserStatus(userId, status, actionReason || undefined);
        const actionLabels: Record<string, string> = { mute: '禁言', unmute: '解禁', deactivate: '注销', reactivate: '恢复' };
        show(`已${actionLabels[action]}`, 'success');
        setUsers((prev) => prev.map((u) => u.id === userId ? {
          ...u,
          status,
          status_reason: actionReason || '',
        } : u));
      }
      setActionReason('');
    } catch (err: any) {
      show(err?.message || '操作失败', 'error');
    } finally {
      setUserOperating(null);
    }
  };

  // ===== 敏感词管理操作 =====

  const handleAddWord = async () => {
    if (!newWord.trim()) {
      show('请输入敏感词', 'error');
      return;
    }
    setAddingWord(true);
    try {
      await api.admin.addSensitiveWord(newWord.trim(), newWordCategory);
      show(`已添加敏感词「${newWord.trim()}」`, 'success');
      setNewWord('');
      fetchSensitiveWords();
    } catch (err: any) {
      show(err?.message || '添加失败', 'error');
    } finally {
      setAddingWord(false);
    }
  };

  const handleDeleteWord = async (word: string) => {
    setDeletingWord(word);
    try {
      await api.admin.deleteSensitiveWord(word);
      show(`已删除敏感词「${word}」`, 'success');
      setSensitiveWords((prev) => prev.filter((w) => w.word !== word));
    } catch (err: any) {
      show(err?.message || '删除失败', 'error');
    } finally {
      setDeletingWord(null);
    }
  };

  const handleReloadDFA = async () => {
    try {
      await api.admin.reloadSensitiveWords();
      show('敏感词引擎已重新加载', 'success');
    } catch (err: any) {
      show(err?.message || '重载失败', 'error');
    }
  };

  const handleFeedbackStatus = async (id: string, status: string) => {
    setFeedbackOperating(id);
    try {
      const result = await api.admin.replyFeedback(id, { status });
      const label = FEEDBACK_STATUS_LABEL[result.data.status] || result.data.status;
      show(`已标记为${label}`, 'success');
      setFeedbackEntries((prev) => prev.map((entry) => (
        entry.id === id ? { ...entry, status: result.data.status } : entry
      )));
    } catch (err: any) {
      show(err?.message || '处理失败', 'error');
    } finally {
      setFeedbackOperating(null);
    }
  };

  const handleFeedbackReply = async (entry: FeedbackEntry) => {
    const reply = (feedbackReplyText[entry.id] || '').trim();
    if (!reply) {
      show('请先填写回复内容', 'error');
      return;
    }
    if (!entry.user_id) {
      show('未登录或未关联账号，无法站内回复', 'error');
      return;
    }

    setFeedbackOperating(entry.id);
    try {
      const result = await api.admin.replyFeedback(entry.id, { reply, status: 'replied' });
      show(result.data.notification_sent ? '已回复用户，并发送站内通知' : '已保存回复', 'success');
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      setFeedbackEntries((prev) => prev.map((item) => (
        item.id === entry.id
          ? { ...item, status: result.data.status, admin_reply: reply, replied_at: now }
          : item
      )));
      setFeedbackReplyText((prev) => ({ ...prev, [entry.id]: '' }));
    } catch (err: any) {
      show(err?.message || '回复失败', 'error');
    } finally {
      setFeedbackOperating(null);
    }
  };

  const handleAgreementFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      show('协议文件不能超过 2MB', 'error');
      return;
    }

    setAgreementExtracting(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(file);
      });
      const result = await api.admin.extractServiceAgreementText({
        file_name: file.name,
        data_url: dataUrl,
      });
      setAgreementText(result.data.text);
      show('已从文件读取协议正文，请预览确认后发布', 'success');
    } catch (err: any) {
      show(err?.message || '文件解析失败，请复制全文粘贴到正文区', 'error');
    } finally {
      setAgreementExtracting(false);
    }
  };

  const handlePublishAgreement = async () => {
    if (!agreementVersion.trim()) {
      show('请填写协议版本号', 'error');
      return;
    }
    if (!agreementText.trim()) {
      show('请粘贴或上传协议正文', 'error');
      return;
    }

    setAgreementSaving(true);
    try {
      const result = await api.admin.publishServiceAgreement({
        title: agreementTitle.trim() || '用户服务协议',
        version: agreementVersion.trim(),
        note: agreementNote.trim(),
        text: agreementText.trim(),
        source: 'admin-ui',
      });
      applyAgreementData(result.data as AgreementData);
      show('协议新版本已发布，未确认该版本的用户后续会被要求补确认', 'success');
    } catch (err: any) {
      show(err?.message || '协议发布失败', 'error');
    } finally {
      setAgreementSaving(false);
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
    ? items.filter((i) => i.title.includes(keyword) || i.owner_name.includes(keyword))
    : items;

  const feedbackSummary = feedbackEntries.reduce<Record<string, number>>((acc, item) => {
    const status = item.status || 'submitted';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const notificationTargetSummary = notifAudience === 'all'
    ? '全部注册用户'
    : notifAudience === 'community'
      ? `小区：${notifCommunity || '未选择'}`
      : `指定用户：${notifSelectedUsers.length} 人`;
  const notifVisibleUsers = notifCandidateUsers.filter((user) => {
    const keywordText = notifUserKeyword.trim().toLowerCase();
    const matchKeyword = !keywordText
      || String(user.nickname || '').toLowerCase().includes(keywordText)
      || String(user.phone || '').toLowerCase().includes(keywordText)
      || String(user.community || '').toLowerCase().includes(keywordText);
    const matchCommunity = notifUserCommunityFilter === 'all' || user.community === notifUserCommunityFilter;
    return matchKeyword && matchCommunity && user.status !== 'deactivated';
  });

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'content', label: '内容', icon: <FileText size={16} /> },
    { key: 'users', label: '用户', icon: <Users size={16} /> },
    { key: 'exchanges', label: '交换', icon: <ArrowLeftRight size={16} /> },
    { key: 'feedback', label: '反馈', icon: <MessageSquare size={16} /> },
    { key: 'sensitive', label: '敏感词', icon: <ShieldAlert size={16} /> },
    { key: 'agreement', label: '协议', icon: <Shield size={16} /> },
    { key: 'stats', label: '统计', icon: <BarChart3 size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#f6f0e5] pb-16">
      {/* 顶栏 */}
      <div className="border-b border-[rgba(201,189,171,0.42)] bg-[rgba(255,252,247,0.94)] px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
            <ChevronLeft size={18} className="text-[#7b8791]" />
          </Link>
          <div className="flex-1">
            <div className="text-[11px] text-[#8a7d68]">ADMIN</div>
            <h1 className="text-[18px] font-bold text-[#1c2d24]">管理后台</h1>
          </div>
          <button onClick={() => { fetchItems(); if (activeTab === 'users') fetchUsers(); if (activeTab === 'stats') fetchStats(); if (activeTab === 'exchanges') fetchExchanges(); if (activeTab === 'feedback') fetchFeedback(); if (activeTab === 'sensitive') fetchSensitiveWords(); if (activeTab === 'agreement') fetchAgreement(); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
            <RefreshCw size={16} className="text-[#5d6b63]" />
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="mx-auto max-w-3xl px-4 pt-3">
        <div className="flex gap-1 rounded-2xl bg-white/60 p-1 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              onPointerDown={() => {}}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-[#1f3a30] text-white shadow-sm'
                  : 'text-[#6f7f76] active:bg-[#f3ede2]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-4 space-y-3">
        {/* ===================== 内容管理 Tab ===================== */}
        {activeTab === 'content' && (
          <>
            {/* 发布通知 */}
            <div className="overflow-hidden rounded-[28px] border border-[rgba(201,189,171,0.46)] bg-white/92 shadow-[0_18px_45px_rgba(139,123,96,0.08)]">
              <div className="bg-[linear-gradient(135deg,#fffaf2,#f3f8f3)] px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#d6ab62] shadow-sm">
                    <Bell size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7d957f]">通知运营面板</div>
                    <h2 className="mt-1 text-[18px] font-black text-[#1f3a30]">发布平台通知</h2>
                    <p className="mt-1 text-xs leading-5 text-[#7f8890]">
                      推荐：先选发送对象，再写通知内容。私信只显示未读角标；交换动态由预约流程自动产生。
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#55616b]">通知类型</span>
                    <span className="text-[11px] text-[#9b9487]">人工只发运营类通知</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'platform', title: '平台公告', desc: '规则 / 升级' },
                      { key: 'ops', title: '运营提醒', desc: '活动 / 安全' },
                      { key: 'handling', title: '处理通知', desc: '客服 / 违规' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setNotifType(item.key)}
                        onPointerDown={() => {}}
                        className={`rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                          notifType === item.key
                            ? 'border-[#1f3a30] bg-[#eef4ef] text-[#1f3a30]'
                            : 'border-[#eadfce] bg-[#fffaf3] text-[#6f7f76]'
                        }`}
                      >
                        <span className="block text-sm font-black">{item.title}</span>
                        <span className="mt-0.5 block text-[10px]">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#55616b]">收件人选择器</span>
                    <span className="text-[11px] text-[#9b9487]">{notificationTargetSummary}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'all', title: '全部用户', desc: '全站公告' },
                      { key: 'community', title: '指定小区', desc: '片区运营' },
                      { key: 'users', title: '指定用户', desc: '精准处理' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setNotifAudience(item.key as 'all' | 'community' | 'users')}
                        onPointerDown={() => {}}
                        className={`rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                          notifAudience === item.key
                            ? 'border-[#1f3a30] bg-[#1f3a30] text-white'
                            : 'border-[#eadfce] bg-white text-[#6f7f76]'
                        }`}
                      >
                        <span className="block text-sm font-black">{item.title}</span>
                        <span className={`mt-0.5 block text-[10px] ${notifAudience === item.key ? 'text-white/72' : 'text-[#9b9487]'}`}>
                          {item.desc}
                        </span>
                      </button>
                    ))}
                  </div>

                  {notifAudience === 'community' && (
                    <div className="rounded-2xl bg-[#fffaf3] p-3">
                      <label className="text-[11px] font-bold text-[#7f8890]">选择小区</label>
                      <select
                        value={notifCommunity}
                        onChange={(e) => setNotifCommunity(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-[#e8dcc8] bg-white px-3 py-2.5 text-sm text-[#344238] focus:outline-none"
                      >
                        {communityOptions.map((community) => (
                          <option key={community.name} value={community.name}>{community.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {notifAudience === 'users' && (
                    <div className="space-y-3 rounded-2xl bg-[#fffaf3] p-3">
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                        <div className="relative">
                          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9487]" />
                          <input
                            value={notifUserKeyword}
                            onChange={(e) => setNotifUserKeyword(e.target.value)}
                            placeholder="筛选昵称、手机号或小区"
                            className="w-full rounded-xl border border-[#eadfce] bg-white py-2.5 pl-9 pr-3 text-sm text-[#344238] focus:outline-none focus:ring-2 focus:ring-[#9cbba8]/35"
                          />
                        </div>
                        <select
                          value={notifUserCommunityFilter}
                          onChange={(e) => setNotifUserCommunityFilter(e.target.value)}
                          className="rounded-xl border border-[#eadfce] bg-white px-3 py-2.5 text-sm text-[#344238] focus:outline-none"
                        >
                          <option value="all">全部小区</option>
                          {communityOptions.map((community) => (
                            <option key={community.name} value={community.name}>{community.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={searchNotificationUsers}
                          onPointerDown={() => {}}
                          disabled={notifUserSearching}
                          className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#5e6f66] shadow-sm disabled:opacity-50"
                        >
                          {notifUserSearching ? '刷新中...' : '刷新用户'}
                        </button>
                        <button
                          onClick={() => addNotificationUsers(notifVisibleUsers)}
                          onPointerDown={() => {}}
                          disabled={notifVisibleUsers.length === 0}
                          className="rounded-full bg-[#eef4ef] px-3 py-1.5 text-[11px] font-bold text-[#3d6b57] disabled:opacity-50"
                        >
                          按当前筛选全选
                        </button>
                        <button
                          onClick={() => setNotifSelectedUsers([])}
                          onPointerDown={() => {}}
                          disabled={notifSelectedUsers.length === 0}
                          className="rounded-full bg-[#f6eee4] px-3 py-1.5 text-[11px] font-bold text-[#8c7d63] disabled:opacity-50"
                        >
                          清空已选
                        </button>
                        <span className="text-[11px] text-[#9b9487]">
                          显示 {notifVisibleUsers.length} 人，已选 {notifSelectedUsers.length} 人
                        </span>
                      </div>

                      <div className="max-h-56 overflow-auto rounded-2xl border border-[#f1e8db] bg-white divide-y divide-[#f3ebdf]">
                        {notifCandidateUsers.length === 0 ? (
                          <button
                            onClick={searchNotificationUsers}
                            onPointerDown={() => {}}
                            className="w-full px-3 py-5 text-center text-xs font-semibold text-[#7f8890]"
                          >
                            点击加载用户列表
                          </button>
                        ) : notifVisibleUsers.length === 0 ? (
                          <div className="px-3 py-5 text-center text-xs text-[#9b9487]">没有匹配用户</div>
                        ) : (
                          notifVisibleUsers.map((user) => {
                            const selected = notifSelectedUsers.some((item) => item.id === user.id);
                            return (
                              <button
                                key={user.id}
                                onClick={() => toggleNotificationUser(user)}
                                onPointerDown={() => {}}
                                className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left active:bg-[#f8f2e7] ${selected ? 'bg-[#f7fbf7]' : ''}`}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${selected ? 'bg-[#1f3a30] text-white' : 'bg-[#f3ede2] text-[#5e6f66]'}`}>
                                    {selected ? '✓' : (user.nickname || user.phone || '邻').slice(0, 1)}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-[#344238]">{user.nickname || user.phone || '未命名用户'}</span>
                                    <span className="block truncate text-[11px] text-[#8c949c]">{user.phone || '无手机号'} · {user.community || '未选小区'}</span>
                                  </span>
                                </span>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${selected ? 'bg-[#1f3a30] text-white' : 'bg-[#f3ede2] text-[#5e6f66]'}`}>
                                  {selected ? '已选' : '选择'}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {notifSelectedUsers.length > 0 && (
                        <div className="flex max-h-24 flex-wrap gap-2 overflow-auto rounded-2xl bg-white px-3 py-2">
                          {notifSelectedUsers.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => toggleNotificationUser(user)}
                              onPointerDown={() => {}}
                              className="rounded-full bg-[#eef4ef] px-3 py-1 text-[11px] font-semibold text-[#3d6b57]"
                            >
                              {user.nickname || user.phone} ×
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#55616b]">通知内容</span>
                    <span className="text-[11px] text-[#9b9487]">{notifContent.length}/500</span>
                  </div>
                  <input
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="标题，例如：平台升级通知"
                    className="w-full rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm text-[#344238] focus:outline-none focus:ring-2 focus:ring-[#9cbba8]/35"
                    maxLength={50}
                  />
                  <textarea
                    value={notifContent}
                    onChange={(e) => setNotifContent(e.target.value)}
                    placeholder="正文，例如：童邻市集将于5月1日进行系统升级，届时服务可能会短暂中断。"
                    className="w-full resize-none rounded-2xl border border-transparent bg-[#f8f2e7] px-4 py-3 text-sm leading-6 text-[#344238] focus:outline-none focus:ring-2 focus:ring-[#d6ab62]/30"
                    rows={4}
                    maxLength={500}
                  />
                </section>

                <div className="flex items-center gap-2 rounded-2xl bg-[#f3ede2] p-2">
                  <div className="min-w-0 flex-1 px-2 text-xs leading-5 text-[#5e6f66]">
                    <span className="font-bold">本次将发送：</span>{notificationTargetSummary}
                  </div>
                  <button
                    onClick={handleBroadcast}
                    onPointerDown={() => {}}
                    disabled={broadcasting || !notifTitle.trim() || !notifContent.trim() || (notifAudience === 'users' && notifSelectedUsers.length === 0)}
                    className="shrink-0 rounded-xl bg-[#1f3a30] px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50 active:bg-[#173026]"
                  >
                    {broadcasting ? '发送中...' : '发送'}
                  </button>
                </div>
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
                    onPointerDown={() => {}}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      filterStatus === s ? 'bg-[#1f3a30] text-white' : 'bg-[#f3ede2] text-[#5e6f66]'
                    }`}
                  >
                    {s === 'all' ? '全部' : STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

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
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[#f0e8db]">
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>
                        )}
                      </div>
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
                        {isDeleted && item.delete_reason && (
                          <p className="mt-1 line-clamp-1 text-[10px] text-red-500">
                            删除原因：{item.delete_reason}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {isDeleted ? (
                          <button
                            disabled={busy}
                            onClick={() => handleRestore(item.id)}
                            onPointerDown={() => {}}
                            className="flex items-center gap-1 rounded-xl bg-[#eef4ef] px-3 py-1.5 text-xs font-medium text-[#3d6b57] disabled:opacity-50"
                          >
                            <RotateCcw size={12} />
                            恢复
                          </button>
                        ) : (
                          <button
                            disabled={busy}
                            onClick={() => handleDelete(item.id, item.title)}
                            onPointerDown={() => {}}
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
          </>
        )}

        {/* ===================== 用户管理 Tab ===================== */}
        {activeTab === 'users' && (
          <>
            {/* 搜索 */}
            <div className="paper-surface rounded-[24px] p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-[#5f806f]" />
                <h2 className="text-sm font-bold text-[#55616b]">用户管理</h2>
              </div>
              <p className="text-xs text-[#8c949c]">可对用户进行禁言（无法发布/私信）、注销（无法登录）等操作。</p>
              <div className="flex gap-2">
                <input
                  value={userKeyword}
                  onChange={(e) => setUserKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  placeholder="搜索昵称或手机号…"
                  className="soft-input flex-1 rounded-xl px-3 py-2.5 text-sm"
                />
                <button
                  onClick={fetchUsers}
                  onPointerDown={() => {}}
                  className="flex items-center gap-1 rounded-xl bg-[#1f3a30] px-4 py-2.5 text-xs font-semibold text-white active:bg-[#173026]"
                >
                  <Search size={14} />
                  搜索
                </button>
              </div>
            </div>

            <p className="text-xs text-[#8c949c] px-1">
              共 {users.length} 位用户
              {userKeyword && `（搜索：${userKeyword}）`}
            </p>

            {/* 用户列表 */}
            {usersLoading ? (
              <div className="paper-surface rounded-[24px] p-8 text-center text-sm text-[#8c949c]">加载中…</div>
            ) : users.length === 0 ? (
              <div className="paper-surface rounded-[24px] p-8 text-center text-sm text-[#8c949c]">暂无用户数据</div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => {
                  const userStatus = user.status || 'active';
                  const isActive = userStatus === 'active';
                  const isMuted = userStatus === 'muted';
                  const isDeactivated = userStatus === 'deactivated';
                  const busy = userOperating === user.id;
                  return (
                    <div key={user.id} className={`paper-surface rounded-[20px] p-4 ${isDeactivated ? 'opacity-60' : ''}`}>
                      {/* 上方：用户基本信息 */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f0e8db] text-lg">
                          {user.is_admin ? '👑' : isDeactivated ? '🚫' : isMuted ? '🔇' : user.is_liaison ? '🌟' : '😊'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="truncate text-sm font-semibold text-[#1c2d24]">{user.nickname}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${USER_STATUS_COLOR[userStatus] || 'bg-gray-100 text-gray-600'}`}>
                              {USER_STATUS_LABEL[userStatus] ?? userStatus}
                            </span>
                            {user.is_admin ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">管理员</span>
                            ) : null}
                            {user.is_liaison ? (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">联络员</span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-[#8c949c]">
                            {user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定手机'}
                            {' · '}{user.community || '未选择小区'}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-[#b0a898]">
                            <span>{getTrustLevel(user.exchange_count).label}</span>
                            <span>·</span>
                            <span>交换 {user.exchange_count} 次</span>
                            <span>·</span>
                            <span>{user.created_at?.slice(0, 10)}</span>
                          </div>
                          {user.status_reason ? (
                            <p className="mt-1 text-[10px] text-red-500 truncate">原因：{user.status_reason}</p>
                          ) : null}
                        </div>
                      </div>
                      {/* 下方：操作按钮 */}
                      {!Boolean(user.is_admin) && (
                        <div className="mt-3 flex gap-2 flex-wrap border-t border-[#f3ebdf] pt-3">
                          {isActive && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => { setActionReason(''); setUserActionDialog({ userId: user.id, nickname: user.nickname, action: 'mute' }); }}
                                onPointerDown={() => {}}
                                className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 active:bg-amber-100 disabled:opacity-50"
                              >
                                <VolumeX size={12} />
                                禁言
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => { setActionReason(''); setUserActionDialog({ userId: user.id, nickname: user.nickname, action: 'deactivate' }); }}
                                onPointerDown={() => {}}
                                className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 active:bg-red-100 disabled:opacity-50"
                              >
                                <UserX size={12} />
                                注销
                              </button>
                            </>
                          )}

                          {isMuted && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => { setActionReason(''); setUserActionDialog({ userId: user.id, nickname: user.nickname, action: 'unmute' }); }}
                                onPointerDown={() => {}}
                                className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 active:bg-green-100 disabled:opacity-50"
                              >
                                <Volume2 size={12} />
                                解禁
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => { setActionReason(''); setUserActionDialog({ userId: user.id, nickname: user.nickname, action: 'deactivate' }); }}
                                onPointerDown={() => {}}
                                className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 active:bg-red-100 disabled:opacity-50"
                              >
                                <UserX size={12} />
                                注销
                              </button>
                            </>
                          )}

                          {isDeactivated && (
                            <button
                              disabled={busy}
                              onClick={() => { setActionReason(''); setUserActionDialog({ userId: user.id, nickname: user.nickname, action: 'reactivate' }); }}
                              onPointerDown={() => {}}
                              className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 active:bg-green-100 disabled:opacity-50"
                            >
                              <UserCheck size={12} />
                              恢复账号
                            </button>
                          )}

                          {/* 管理员设置 — 低调样式，需二次确认 */}
                          <button
                            disabled={busy}
                            onClick={() => setUserActionDialog({ userId: user.id, nickname: user.nickname, action: 'setAdmin' })}
                            onPointerDown={() => {}}
                            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium bg-[#f3ede2] text-[#9a9288] active:bg-[#e8dcc8] disabled:opacity-50 ml-auto"
                          >
                            <Shield size={12} />
                            设为管理员
                          </button>
                        </div>
                      )}

                      {/* 管理员用户：只有取消管理员按钮 */}
                      {Boolean(user.is_admin) && (
                        <div className="mt-3 flex gap-2 flex-wrap border-t border-[#f3ebdf] pt-3">
                          <button
                            disabled={busy}
                            onClick={() => setUserActionDialog({ userId: user.id, nickname: user.nickname, action: 'removeAdmin' })}
                            onPointerDown={() => {}}
                            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 active:bg-red-100 disabled:opacity-50 ml-auto"
                          >
                            <Shield size={12} />
                            取消管理员
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===================== 交换管理 Tab ===================== */}
        {activeTab === 'exchanges' && (
          <>
            {/* 筛选条 */}
            <div className="paper-surface rounded-[24px] p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <ArrowLeftRight size={16} className="text-[#d6ab62]" />
                <h2 className="text-sm font-bold text-[#55616b]">交换管理</h2>
              </div>
              <p className="text-xs text-[#8c949c]">查看所有交换记录，管理员可手动修改异常状态。</p>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'pending', 'completed', 'cancelled', 'failed'] as const).map((s) => {
                  const EXCHANGE_STATUS_LABEL: Record<string, string> = { all: '全部', pending: '进行中', completed: '已完成', cancelled: '已取消', failed: '已失败' };
                  return (
                    <button
                      key={s}
                      onClick={() => setExchangeFilter(s)}
                      onPointerDown={() => {}}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        exchangeFilter === s ? 'bg-[#1f3a30] text-white' : 'bg-[#f3ede2] text-[#5e6f66]'
                      }`}
                    >
                      {EXCHANGE_STATUS_LABEL[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-[#8c949c] px-1">
              共 {exchangeTotal} 条记录
            </p>

            {/* 交换列表 */}
            {exchangesLoading ? (
              <div className="paper-surface rounded-[24px] p-8 text-center text-sm text-[#8c949c]">加载中…</div>
            ) : exchanges.length === 0 ? (
              <div className="paper-surface rounded-[24px] p-8 text-center text-sm text-[#8c949c]">暂无交换记录</div>
            ) : (
              <div className="paper-surface rounded-[28px] divide-y divide-[#f3ebdf] overflow-hidden">
                {exchanges.map((ex) => {
                  const EXCHANGE_STATUS_LABEL: Record<string, string> = { pending: '进行中', completed: '已完成', cancelled: '已取消', failed: '已失败' };
                  const EXCHANGE_STATUS_COLOR: Record<string, string> = {
                    pending: 'bg-amber-100 text-amber-700',
                    completed: 'bg-blue-100 text-blue-700',
                    cancelled: 'bg-gray-100 text-gray-600',
                    failed: 'bg-red-100 text-red-600',
                  };
                  const status = String(ex.status || 'pending');
                  const itemImages = (() => {
                    try { return JSON.parse(String(ex.item_images || '[]')); } catch { return []; }
                  })();
                  return (
                    <Link
                      key={String(ex.id)}
                      href={`/admin/exchanges/${ex.id}`}
                      className={`flex items-center gap-3 px-4 py-3.5 active:bg-[#f8f2e7] transition-colors ${status === 'cancelled' ? 'opacity-60' : ''}`}
                    >
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[#f0e8db]">
                        {itemImages[0] ? (
                          <img src={itemImages[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl">🔄</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#1c2d24]">{ex.item_title || '未知物品'}</p>
                        <p className="mt-0.5 text-[11px] text-[#8c949c]">
                          {ex.requester_nickname} → {ex.owner_nickname}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${EXCHANGE_STATUS_COLOR[status] || 'bg-gray-100 text-gray-600'}`}>
                            {EXCHANGE_STATUS_LABEL[status] ?? status}
                          </span>
                          <span className="text-[10px] text-[#b0a898]">
                            {String(ex.created_at || '').slice(0, 10)}
                          </span>
                        </div>
                        {ex.fail_reason && (
                          <p className="mt-0.5 text-[10px] text-red-500 truncate">原因：{ex.fail_reason}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===================== 反馈处理 Tab ===================== */}
        {activeTab === 'feedback' && (
          <>
            <div className="paper-surface rounded-[24px] p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#eef4ef] text-[#3d6b57]">
                  <MessageSquare size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-bold text-[#1c2d24]">反馈处理</h2>
                  <p className="mt-1 text-xs leading-5 text-[#8c949c]">
                    登录用户可直接站内回复；用户查看位置：消息 → 通知。未登录反馈只能根据联系方式线下处理或内部记录。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {([
                  ['submitted', '待处理', feedbackSummary.submitted || 0, 'text-amber-700 bg-amber-50'],
                  ['processing', '处理中', feedbackSummary.processing || 0, 'text-blue-700 bg-blue-50'],
                  ['replied', '已回复', feedbackSummary.replied || 0, 'text-green-700 bg-green-50'],
                  ['closed', '已关闭', feedbackSummary.closed || 0, 'text-gray-600 bg-gray-100'],
                ] as const).map(([key, label, count, tone]) => (
                  <button
                    key={key}
                    onClick={() => setFeedbackFilter(key)}
                    onPointerDown={() => {}}
                    className={`rounded-2xl px-2 py-3 text-left transition-colors ${feedbackFilter === key ? 'ring-2 ring-[#1f3a30]/20' : ''} ${tone}`}
                  >
                    <div className="text-lg font-black leading-none">{count}</div>
                    <div className="mt-1 text-[10px] font-semibold">{label}</div>
                  </button>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                {(['all', 'submitted', 'processing', 'replied', 'closed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFeedbackFilter(s)}
                    onPointerDown={() => {}}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      feedbackFilter === s ? 'bg-[#1f3a30] text-white' : 'bg-[#f3ede2] text-[#5e6f66]'
                    }`}
                  >
                    {s === 'all' ? '全部' : FEEDBACK_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#8c949c] px-1">
              共 {feedbackTotal} 条反馈
            </p>

            {feedbackLoading ? (
              <div className="paper-surface rounded-[24px] p-8 text-center text-sm text-[#8c949c]">加载中…</div>
            ) : feedbackEntries.length === 0 ? (
              <div className="paper-surface rounded-[24px] p-8 text-center text-sm text-[#8c949c]">暂无反馈记录</div>
            ) : (
              <div className="space-y-3">
                {feedbackEntries.map((entry) => {
                  const canReply = Boolean(entry.user_id);
                  const status = entry.status || 'submitted';
                  const busy = feedbackOperating === entry.id;
                  const replyText = feedbackReplyText[entry.id] || '';
                  return (
                    <div key={entry.id} className="paper-surface overflow-hidden rounded-[24px]">
                      <div className="border-b border-[#f3ebdf] bg-[#fffaf3] px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${
                            entry.type === '举报投诉' ? 'bg-red-50 text-red-600' : 'bg-[#eef4ef] text-[#3d6b57]'
                          }`}>
                            {entry.type === '举报投诉' ? <ShieldAlert size={18} /> : <Inbox size={18} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-[#1c2d24]">{entry.type || '反馈'}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${FEEDBACK_STATUS_COLOR[status] || 'bg-gray-100 text-gray-600'}`}>
                                {FEEDBACK_STATUS_LABEL[status] || status}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${canReply ? 'bg-[#eef4ef] text-[#3d6b57]' : 'bg-[#fff0e2] text-[#9a6b32]'}`}>
                                {canReply ? '可站内回复' : '只能内部处理'}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-[#8c949c]">
                              {entry.created_at?.slice(0, 16)} · {entry.user_nickname ? `${entry.user_nickname} · ${entry.user_community || '未选择小区'}` : '未登录用户'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 p-4">
                        <div className="grid gap-2 text-[11px] text-[#7f8890] sm:grid-cols-2">
                          <div className="rounded-2xl bg-[#f8f2e7] px-3 py-2">
                            用户：{entry.user_nickname || '未登录用户'}
                            {entry.user_phone ? ` · ${entry.user_phone}` : ''}
                          </div>
                          <div className="rounded-2xl bg-[#f8f2e7] px-3 py-2">
                            联系方式：{entry.contact || '未填写'}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-[#f8f2e7] px-3 py-3 text-sm leading-6 text-[#344238] whitespace-pre-wrap">
                          {entry.content}
                        </div>

                        {entry.admin_reply ? (
                          <div className="rounded-2xl bg-[#eef4ef] px-3 py-3">
                            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#3d6b57]">
                              <CheckCircle2 size={13} />
                              已回复 {entry.replied_at ? `· ${entry.replied_at.slice(0, 16)}` : ''}
                            </div>
                            <p className="text-sm leading-6 text-[#344238] whitespace-pre-wrap">{entry.admin_reply}</p>
                          </div>
                        ) : null}

                        {canReply ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#55616b]">
                              <Clock3 size={13} className="text-[#8c949c]" />
                              快捷回复
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {FEEDBACK_QUICK_REPLIES.map((quickReply) => (
                                <button
                                  key={quickReply}
                                  onClick={() => setFeedbackReplyText((prev) => ({ ...prev, [entry.id]: quickReply }))}
                                  onPointerDown={() => {}}
                                  className="rounded-full bg-[#f3ede2] px-3 py-1.5 text-[11px] font-medium text-[#5e6f66] active:bg-[#eadfcc]"
                                >
                                  {quickReply}
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={replyText}
                              onChange={(e) => setFeedbackReplyText((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                              placeholder="写给用户的处理回复，会通过站内通知发送到：消息 → 通知"
                              rows={3}
                              maxLength={500}
                              className="w-full resize-none rounded-2xl bg-[#fffaf3] px-3 py-2.5 text-sm leading-6 text-[#344238] focus:outline-none focus:ring-2 focus:ring-[#9cbba8]/40"
                            />
                            <button
                              onClick={() => handleFeedbackReply(entry)}
                              onPointerDown={() => {}}
                              disabled={busy || !replyText.trim()}
                              className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#1f3a30] px-4 py-3 text-sm font-bold text-white disabled:opacity-50 active:bg-[#173026]"
                            >
                              <Send size={14} />
                              发送站内回复并标记已回复
                            </button>
                            <p className="text-[11px] leading-5 text-[#8c949c]">
                              用户查看位置：消息 → 通知。回复后这条反馈会自动标记为已回复。
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-[#fff6ea] px-3 py-2 text-xs leading-5 text-[#9a6b32]">
                            未登录或未关联账号，无法站内回复。若用户未留联系方式，只能内部记录处理结果。
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 border-t border-[#f3ebdf] pt-3">
                          <button
                            onClick={() => handleFeedbackStatus(entry.id, 'processing')}
                            onPointerDown={() => {}}
                            disabled={busy || status === 'processing'}
                            className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 disabled:opacity-50"
                          >
                            标记处理中
                          </button>
                          <button
                            onClick={() => handleFeedbackStatus(entry.id, 'closed')}
                            onPointerDown={() => {}}
                            disabled={busy || status === 'closed'}
                            className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-50"
                          >
                            关闭工单
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===================== 敏感词管理 Tab ===================== */}
        {activeTab === 'sensitive' && (
          <>
            {/* 说明 + 重载 */}
            <div className="paper-surface rounded-[24px] p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert size={16} className="text-[#d6ab62]" />
                <h2 className="text-sm font-bold text-[#55616b]">敏感词管理</h2>
              </div>
              <p className="text-xs text-[#8c949c]">管理动态敏感词库。内置词库包含基础敏感内容和协议风控词（宠物活物、食品药品、贴身卫生风险、危险品、侵权仿冒等）。发布场景中协议明确禁止的内容会直接拦截；私信与预约留言保持替换提示，降低误伤。</p>
              <button
                onClick={handleReloadDFA}
                onPointerDown={() => {}}
                className="flex items-center gap-1.5 rounded-xl bg-[#f3ede2] px-4 py-2 text-xs font-medium text-[#5e6f66] active:bg-[#e8dcc8]"
              >
                <RefreshCw size={12} />
                重载敏感词引擎
              </button>
            </div>

            {/* 添加敏感词 */}
            <div className="paper-surface rounded-[24px] p-4 space-y-3">
              <h3 className="text-sm font-bold text-[#55616b]">添加敏感词</h3>
              <div className="flex gap-2">
                <input
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                  placeholder="输入敏感词…"
                  className="soft-input flex-1 rounded-xl px-3 py-2.5 text-sm"
                  maxLength={30}
                />
                <select
                  value={newWordCategory}
                  onChange={(e) => setNewWordCategory(e.target.value)}
                  className="rounded-xl border border-[#e8dcc8] bg-white px-3 py-2 text-xs text-[#5e6f66] focus:outline-none"
                >
                  <option value="political">政治敏感</option>
                  <option value="porn">色情低俗</option>
                  <option value="gambling">赌博</option>
                  <option value="drugs">毒品</option>
                  <option value="insult">辱骂</option>
                  <option value="ad">广告</option>
                  <option value="live_animal">宠物活物</option>
                  <option value="food_medicine">食品药品</option>
                  <option value="hygiene_risk">贴身卫生风险</option>
                  <option value="safety_hazard">安全隐患</option>
                  <option value="counterfeit">侵权仿冒</option>
                  <option value="dangerous_goods">危险品</option>
                  <option value="payment_risk">资金风险</option>
                  <option value="privacy">隐私风险</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <button
                onClick={handleAddWord}
                onPointerDown={() => {}}
                disabled={addingWord || !newWord.trim()}
                className="flex items-center gap-1 rounded-xl bg-[#1f3a30] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 active:bg-[#173026]"
              >
                <Plus size={14} />
                {addingWord ? '添加中...' : '添加'}
              </button>
            </div>

            {/* 动态词库列表 */}
            <div className="paper-surface rounded-[24px] p-4 space-y-3">
              <h3 className="text-sm font-bold text-[#55616b]">动态词库 ({sensitiveWords.length})</h3>
              <p className="text-xs text-[#8c949c]">以下为管理员手动添加的敏感词，可删除。内置词库不可在此管理。</p>
              {sensitiveLoading ? (
                <div className="py-4 text-center text-sm text-[#8c949c]">加载中…</div>
              ) : sensitiveWords.length === 0 ? (
                <div className="py-4 text-center text-sm text-[#8c949c]">暂无动态敏感词，内置词库仍在生效</div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {(() => {
                    const CATEGORY_LABEL: Record<string, string> = {
                      political: '政治', porn: '色情', gambling: '赌博',
                      drugs: '毒品', insult: '辱骂', ad: '广告', live_animal: '宠物活物',
                      food_medicine: '食品药品', hygiene_risk: '卫生风险', safety_hazard: '安全隐患',
                      counterfeit: '侵权仿冒', dangerous_goods: '危险品', payment_risk: '资金风险',
                      privacy: '隐私风险', other: '其他',
                    };
                    const CATEGORY_COLOR: Record<string, string> = {
                      political: 'bg-red-100 text-red-700',
                      porn: 'bg-pink-100 text-pink-700',
                      gambling: 'bg-orange-100 text-orange-700',
                      drugs: 'bg-purple-100 text-purple-700',
                      insult: 'bg-amber-100 text-amber-700',
                      ad: 'bg-blue-100 text-blue-700',
                      live_animal: 'bg-rose-100 text-rose-700',
                      food_medicine: 'bg-lime-100 text-lime-700',
                      hygiene_risk: 'bg-cyan-100 text-cyan-700',
                      safety_hazard: 'bg-orange-100 text-orange-700',
                      counterfeit: 'bg-indigo-100 text-indigo-700',
                      dangerous_goods: 'bg-red-100 text-red-700',
                      payment_risk: 'bg-yellow-100 text-yellow-700',
                      privacy: 'bg-slate-100 text-slate-700',
                      other: 'bg-gray-100 text-gray-600',
                    };
                    return sensitiveWords.map((w) => {
                      const cat = w.category || 'other';
                      const busy = deletingWord === w.word;
                      return (
                        <div key={w.id || w.word} className="flex items-center gap-2 rounded-xl bg-[#f8f2e7] px-3 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLOR[cat] || CATEGORY_COLOR.other}`}>
                            {CATEGORY_LABEL[cat] || cat}
                          </span>
                          <span className="flex-1 text-sm text-[#1c2d24] truncate">{w.word}</span>
                          <span className="text-[10px] text-[#b0a898]">{w.created_at?.slice(0, 10)}</span>
                          <button
                            disabled={busy}
                            onClick={() => handleDeleteWord(w.word)}
                            onPointerDown={() => {}}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 active:bg-red-100 disabled:opacity-50"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===================== 协议管理 Tab ===================== */}
        {activeTab === 'agreement' && (
          <>
            <div className="paper-surface rounded-[24px] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#3d6b57]" />
                <h2 className="text-sm font-bold text-[#55616b]">用户服务协议管理</h2>
              </div>
              <p className="text-xs leading-5 text-[#8c949c]">
                支持上传 .docx / .txt / .md 或直接粘贴正文。发布新版本后，未确认该版本的用户会在后续登录、发布或预约前补确认。
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#6f7f76]">
                <div className="rounded-2xl bg-[#f8f2e7] px-3 py-2">
                  当前版本
                  <div className="mt-1 text-sm font-bold text-[#1c2d24]">{agreement?.version || '-'}</div>
                </div>
                <div className="rounded-2xl bg-[#f8f2e7] px-3 py-2">
                  发布时间
                  <div className="mt-1 text-sm font-bold text-[#1c2d24]">{agreement?.published_at?.slice(0, 16) || '文件默认'}</div>
                </div>
              </div>
            </div>

            <div className="paper-surface rounded-[24px] p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-[#6f7f76]">
                  协议标题
                  <input
                    value={agreementTitle}
                    onChange={(e) => setAgreementTitle(e.target.value)}
                    className="soft-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                    placeholder="用户服务协议"
                  />
                </label>
                <label className="block text-xs font-semibold text-[#6f7f76]">
                  新版本号
                  <input
                    value={agreementVersion}
                    onChange={(e) => setAgreementVersion(e.target.value)}
                    className="soft-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                    placeholder="例如 2026-05-04-v2"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-[#6f7f76]">
                更新备注
                <input
                  value={agreementNote}
                  onChange={(e) => setAgreementNote(e.target.value)}
                  className="soft-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  placeholder="例如：补充宠物活物禁发条款"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d8c9b4] bg-[#fffaf3] px-4 py-4 text-sm font-bold text-[#3d6b57] active:bg-[#f8f2e7]">
                <FileText size={16} />
                {agreementExtracting ? '正在读取文件…' : '上传 Word / 文本文件'}
                <input
                  type="file"
                  accept=".docx,.txt,.md"
                  className="hidden"
                  disabled={agreementExtracting}
                  onChange={(e) => {
                    void handleAgreementFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              <textarea
                value={agreementText}
                onChange={(e) => setAgreementText(e.target.value)}
                rows={14}
                className="w-full resize-y rounded-2xl bg-[#f8f2e7] px-4 py-3 text-sm leading-6 text-[#344238] focus:outline-none focus:ring-2 focus:ring-[#9cbba8]/40"
                placeholder="也可以直接把 Word 里的协议全文粘贴到这里。每一行会作为协议页面中的一段展示。"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  onClick={fetchAgreement}
                  onPointerDown={() => {}}
                  disabled={agreementLoading || agreementSaving}
                  className="rounded-2xl bg-[#f3ede2] px-4 py-3 text-sm font-bold text-[#5e6f66] disabled:opacity-50"
                >
                  {agreementLoading ? '读取中…' : '恢复当前线上版本'}
                </button>
                <button
                  onClick={handlePublishAgreement}
                  onPointerDown={() => {}}
                  disabled={agreementSaving || !agreementText.trim() || !agreementVersion.trim()}
                  className="flex-1 rounded-2xl bg-[#1f3a30] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(31,58,48,0.18)] disabled:opacity-50"
                >
                  {agreementSaving ? '发布中…' : '发布新协议版本'}
                </button>
              </div>
            </div>

            <div className="paper-surface rounded-[24px] p-4">
              <h3 className="text-sm font-bold text-[#55616b]">预览</h3>
              <div className="mt-3 max-h-[46vh] space-y-2 overflow-y-auto rounded-2xl bg-white/70 p-3">
                {agreementText.trim() ? agreementText.split('\n').filter(Boolean).slice(0, 80).map((line, index) => (
                  <p key={`${index}-${line.slice(0, 12)}`} className="text-xs leading-6 text-[#44534a]">
                    {line}
                  </p>
                )) : (
                  <p className="text-xs text-[#8c949c]">暂无正文，上传或粘贴后可在这里预览。</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ===================== 数据统计 Tab ===================== */}
        {activeTab === 'stats' && (
          <>
            {statsLoading ? (
              <div className="paper-surface rounded-[24px] p-8 text-center text-sm text-[#8c949c]">加载中…</div>
            ) : stats ? (
              <>
                {/* 核心指标卡片 */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="paper-surface rounded-[20px] p-4 cursor-pointer active:bg-[#f8f2e7] transition-colors"
                    onClick={() => setActiveTab('users')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <Users size={16} className="text-blue-600" />
                      </div>
                      <span className="text-xs text-[#8c949c]">总用户数</span>
                    </div>
                    <div className="text-2xl font-bold text-[#1c2d24]">{stats.users.total}</div>
                    <div className="mt-1 text-[11px] text-[#3d6b57]">
                      今日新增 <span className="font-semibold">{stats.users.newToday}</span>
                    </div>
                  </div>

                  <div
                    className="paper-surface rounded-[20px] p-4 cursor-pointer active:bg-[#f8f2e7] transition-colors"
                    onClick={() => setActiveTab('content')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                        <FileText size={16} className="text-emerald-600" />
                      </div>
                      <span className="text-xs text-[#8c949c]">总物品数</span>
                    </div>
                    <div className="text-2xl font-bold text-[#1c2d24]">{stats.items.total}</div>
                    <div className="mt-1 text-[11px] text-[#3d6b57]">
                      在架 <span className="font-semibold">{stats.items.active}</span> · 今日 <span className="font-semibold">{stats.items.newToday}</span>
                    </div>
                  </div>

                  <div
                    className="paper-surface rounded-[20px] p-4 cursor-pointer active:bg-[#f8f2e7] transition-colors"
                    onClick={() => setActiveTab('exchanges')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                        <ArrowLeftRight size={16} className="text-amber-600" />
                      </div>
                      <span className="text-xs text-[#8c949c]">交换总数</span>
                    </div>
                    <div className="text-2xl font-bold text-[#1c2d24]">{stats.exchanges.total}</div>
                    <div className="mt-1 text-[11px] text-[#3d6b57]">
                      完成 <span className="font-semibold">{stats.exchanges.completed}</span> · 进行中 <span className="font-semibold">{stats.exchanges.pending}</span>
                    </div>
                  </div>

                  <div
                    className="paper-surface rounded-[20px] p-4 cursor-pointer active:bg-[#f8f2e7] transition-colors"
                    onClick={() => setActiveTab('content')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                        <Bell size={16} className="text-red-600" />
                      </div>
                      <span className="text-xs text-[#8c949c]">待审核</span>
                    </div>
                    <div className="text-2xl font-bold text-[#1c2d24]">{stats.pendingReviews}</div>
                    <div className="mt-1 text-[11px] text-[#8c949c]">
                      {stats.pendingReviews > 0 ? '有物品等待审核' : '暂无待审核'}
                    </div>
                  </div>
                </div>

                {/* 平台运营概览 */}
                <div className="paper-surface rounded-[24px] p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 size={16} className="text-[#5f806f]" />
                    <h2 className="text-sm font-bold text-[#55616b]">平台运营概览</h2>
                  </div>

                  {/* 物品活跃率 */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#6f7f76]">物品活跃率</span>
                      <span className="font-semibold text-[#3d6b57]">
                        {stats.items.total > 0 ? Math.round(stats.items.active / stats.items.total * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f0e8db]">
                      <div
                        className="h-full rounded-full bg-[#5f806f] transition-all"
                        style={{ width: `${stats.items.total > 0 ? Math.round(stats.items.active / stats.items.total * 100) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* 交换完成率 */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#6f7f76]">交换完成率</span>
                      <span className="font-semibold text-[#3d6b57]">
                        {stats.exchanges.total > 0 ? Math.round(stats.exchanges.completed / stats.exchanges.total * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f0e8db]">
                      <div
                        className="h-full rounded-full bg-[#d6ab62] transition-all"
                        style={{ width: `${stats.exchanges.total > 0 ? Math.round(stats.exchanges.completed / stats.exchanges.total * 100) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* 人均物品 */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#6f7f76]">人均发布物品</span>
                      <span className="font-semibold text-[#3d6b57]">
                        {stats.users.total > 0 ? (stats.items.total / stats.users.total).toFixed(1) : '0'}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f0e8db]">
                      <div
                        className="h-full rounded-full bg-[#8eb89e] transition-all"
                        style={{ width: `${Math.min(100, stats.users.total > 0 ? (stats.items.total / stats.users.total) * 20 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 数据更新时间 */}
                <div className="text-center text-[11px] text-[#b0a898] pt-2">
                  数据刷新时间：{new Date().toLocaleString('zh-CN')}
                </div>
              </>
            ) : (
              <div className="paper-surface rounded-[24px] p-8 text-center text-sm text-[#8c949c]">暂无统计数据</div>
            )}
          </>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-[24px] bg-white p-5 shadow-2xl">
            <p className="text-center text-base font-bold text-[#1c2d24]">删除并通知发布者</p>
            <p className="mt-2 text-sm leading-6 text-[#5e6f66]">
              确定删除「{confirmDialog.title}」吗？请填写原因，系统会同步发送给发布者，并保留在后台记录中。
            </p>
            <textarea
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              placeholder="例如：平台禁止发布宠物、活物及相关转让信息"
              className="mt-4 h-24 w-full resize-none rounded-2xl border border-[#eadfca] bg-[#fffaf2] px-3 py-3 text-sm outline-none focus:border-[#d6ab62]"
              maxLength={240}
            />
            <p className="mt-1 text-right text-[10px] text-[#b0a898]">{deleteReason.length}/240</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setConfirmDialog(null);
                  setDeleteReason('');
                }}
                className="flex-1 rounded-2xl bg-[#f3ede2] py-2.5 text-sm font-semibold text-[#5e6f66] active:opacity-70"
              >
                取消
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={!deleteReason.trim() || operating === confirmDialog.id}
                className="flex-1 rounded-2xl bg-red-500 py-2.5 text-sm font-bold text-white active:opacity-80 disabled:opacity-45"
              >
                {operating === confirmDialog.id ? '删除中' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户操作确认弹窗 */}
      {userActionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setUserActionDialog(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const { action, nickname } = userActionDialog;
              const isDanger = action === 'mute' || action === 'deactivate';
              const isHighRisk = action === 'setAdmin' || action === 'removeAdmin';
              const titles: Record<string, string> = { mute: '禁言用户', unmute: '解除禁言', deactivate: '注销用户', reactivate: '恢复账号', setAdmin: '⚠️ 设为管理员', removeAdmin: '取消管理员' };
              const messages: Record<string, string> = {
                mute: `确定要禁言「${nickname}」吗？禁言后该用户将无法发布物品和发送私信，但仍可登录浏览。`,
                unmute: `确定要解除「${nickname}」的禁言吗？解禁后该用户可正常发布和私信。`,
                deactivate: `确定要注销「${nickname}」的账号吗？注销后该用户将无法登录，其所有在架物品将被下架。`,
                reactivate: `确定要恢复「${nickname}」的账号吗？恢复后该用户可正常登录使用。`,
                setAdmin: `⚠️ 确定要将「${nickname}」设为管理员吗？\n\n管理员拥有完整后台权限，包括内容管理、用户管理、数据统计等。此操作请谨慎执行。`,
                removeAdmin: `确定要取消「${nickname}」的管理员权限吗？取消后该用户将无法访问管理后台。`,
              };
              const confirmLabels: Record<string, string> = { mute: '确认禁言', unmute: '确认解禁', deactivate: '确认注销', reactivate: '确认恢复', setAdmin: '确认设为管理员', removeAdmin: '确认取消管理员' };
              return (
                <>
                  <h3 className={`text-base font-bold ${isHighRisk ? 'text-amber-700' : 'text-[#1c2d24]'}`}>{titles[action]}</h3>
                  <p className="mt-2 text-sm text-[#6f7f76] whitespace-pre-line">{messages[action]}</p>
                  {isHighRisk && action === 'setAdmin' && (
                    <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                      管理员权限包括：删除物品、禁言/注销用户、发布系统通知等。请确认对方身份可信。
                    </div>
                  )}
                  {isDanger && (
                    <div className="mt-3">
                      <input
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        onPointerDown={() => {}}
                        placeholder={isDanger ? '填写原因（可选，用户可见）' : '备注（可选）'}
                        className="soft-input w-full rounded-xl px-3 py-2.5 text-sm"
                        maxLength={100}
                      />
                    </div>
                  )}
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setUserActionDialog(null)}
                      onPointerDown={() => {}}
                      className="flex-1 rounded-xl bg-[#f3ede2] py-2.5 text-sm font-medium text-[#5e6f66] active:bg-[#e8dcc8]"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleUserAction}
                      onPointerDown={() => {}}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white active:opacity-90 ${
                        isDanger ? 'bg-red-500' : isHighRisk ? 'bg-amber-600' : 'bg-[#1f3a30]'
                      }`}
                    >
                      {confirmLabels[action]}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
