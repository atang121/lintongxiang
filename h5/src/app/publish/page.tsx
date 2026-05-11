'use client';

import Link from 'next/link';
import { ChangeEvent, Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, ChevronLeft, X } from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { normalizeItem } from '@/lib/normalize';
import {
  AGE_LABELS,
  AgeRange,
  CATEGORY_LABELS,
  ExchangeMode,
  getExchangeModeLabel,
  getPriceNegotiableLabel,
  ItemCategory,
  LISTING_TYPE_LABELS,
  ListingType,
  PriceNegotiable,
} from '@/types';
import {
  SERVICE_AGREEMENT_VERSION,
} from '@/data/serviceAgreement';

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

type UploadImageState = {
  id: string;
  fileName: string;
  previewUrl: string;
  uploadedUrl: string;
  uploading: boolean;
  error?: string;
};

const EXCHANGE_MODE_OPTIONS: ExchangeMode[] = ['gift', 'swap', 'sell'];
const PUBLISH_DRAFT_VERSION = 1;

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

export default function PublishPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f0e5] flex items-center justify-center"><p className="text-[#9a9288]">加载中...</p></div>}>
      <PublishContent />
    </Suspense>
  );
}

function PublishContent() {
  const router = useRouter();
  const { addItem, currentUser, opsConfig, opsSource, refreshItems, userLocation } = useApp();
  const { show } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [images, setImages] = useState<UploadImageState[]>([]);
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const editId = searchParams.get('edit');
  const isEditing = Boolean(editId);
  const initialType: ListingType = typeParam === 'wanted' ? 'wanted' : 'offer';
  const [listingType, setListingType] = useState<ListingType>(initialType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ItemCategory>('toy');
  const [ageRange, setAgeRange] = useState<AgeRange>('0-3');
  const [exchangeMode, setExchangeMode] = useState<ExchangeMode>('gift');
  const [price, setPrice] = useState('');
  const [priceNegotiable, setPriceNegotiable] = useState<PriceNegotiable>('negotiable');
  const [condition, setCondition] = useState<string>('轻微使用');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementError, setAgreementError] = useState('');
  const [loadingEditItem, setLoadingEditItem] = useState(false);
  const [loadedEditId, setLoadedEditId] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const agreementErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conditions = ['全新', '几乎全新', '轻微使用', '正常使用'];
  const categories = Object.entries(CATEGORY_LABELS) as [ItemCategory, string][];
  const ages = Object.entries(AGE_LABELS) as [AgeRange, string][];

  const isWanted = listingType === 'wanted';
  const draftKey = `tonglin-publish-draft:${editId ? `edit:${editId}` : 'new'}`;
  const uploadedImages = images.filter((item) => item.uploadedUrl).map((item) => item.uploadedUrl);
  const priceOptions: PriceNegotiable[] = ['fixed', 'negotiable'];
  const presetTags = isWanted
    ? ['教材求购', '可接受旧版', '假期预习', '同小区优先', '可上门自取', '可购买', '可获赠', '急需']
    : ['配件齐全', '有说明书', '品牌正品', '自提优先', '孩子长大了', '国外带回', '可验货', '赠品'];
  const publishConfirmationBullets = isWanted
    ? [
        '本次求购需求真实、合法，不诱导他人提供违禁、危险或不适合儿童使用的物品。',
        '我将自行核实响应方提供的物品情况，所有交易细节由双方自行协商、自行负责。',
      ]
    : [
        '本次发布的闲置物品信息真实、来源合法，不发布违禁、危险或不适合儿童使用的物品。',
        '我将如实说明物品状态和瑕疵，所有交易细节由双方自行协商、自行负责。',
      ];

  useEffect(() => {
    if (!editId || loadedEditId === editId || !currentUser) return;

    let cancelled = false;

    const loadItemForEdit = async () => {
      setLoadingEditItem(true);
      try {
        const result = await api.items.getById(editId);
        if (cancelled) return;

        const item = normalizeItem(result.data);
        if (item.userId !== currentUser.id && !currentUser.isAdmin) {
          show('只能编辑自己发布的内容', 'error');
          router.replace('/profile/items');
          return;
        }

        setListingType(item.listingType);
        setTitle(item.title);
        setDescription(item.description);
        setCategory(item.category);
        setAgeRange(item.ageRange);
        setExchangeMode(item.exchangeMode);
        setPrice(item.price ? String(item.price) : '');
        setPriceNegotiable(item.priceNegotiable || 'negotiable');
        setCondition(item.condition);
        setTags(item.tags || []);
        setImages(
          item.images.map((url, index) => ({
            id: `existing-${index}-${url}`,
            fileName: '已上传图片',
            previewUrl: url,
            uploadedUrl: url,
            uploading: false,
          }))
        );
        setAgreementAccepted(false);
        setLoadedEditId(editId);
      } catch (error: any) {
        show(error?.message || '加载发布内容失败', 'error');
        router.replace('/profile/items');
      } finally {
        if (!cancelled) setLoadingEditItem(false);
      }
    };

    void loadItemForEdit();

    return () => {
      cancelled = true;
    };
  }, [currentUser, editId, loadedEditId, router, show]);

  useEffect(() => {
    if (draftRestored) return;
    if (editId && loadedEditId !== editId) return;

    const storage = getStorage();
    const rawDraft = storage?.getItem(draftKey);
    if (!rawDraft) {
      setDraftRestored(true);
      return;
    }

    try {
      const draft = JSON.parse(rawDraft);
      if (draft?.version !== PUBLISH_DRAFT_VERSION) {
        storage?.removeItem(draftKey);
        setDraftRestored(true);
        return;
      }

      setListingType(draft.listingType === 'wanted' ? 'wanted' : 'offer');
      setTitle(typeof draft.title === 'string' ? draft.title : '');
      setDescription(typeof draft.description === 'string' ? draft.description : '');
      setCategory(draft.category || 'toy');
      setAgeRange(draft.ageRange || '0-3');
      setExchangeMode(draft.exchangeMode || 'gift');
      setPrice(typeof draft.price === 'string' ? draft.price : '');
      setPriceNegotiable(draft.priceNegotiable === 'fixed' ? 'fixed' : 'negotiable');
      setCondition(typeof draft.condition === 'string' ? draft.condition : '轻微使用');
      setTags(Array.isArray(draft.tags) ? draft.tags.filter((tag: unknown) => typeof tag === 'string').slice(0, 5) : []);
      setAgreementAccepted(draft.agreementAccepted === true);
      setImages(
        Array.isArray(draft.images)
          ? draft.images
              .filter((url: unknown) => typeof url === 'string' && url)
              .slice(0, opsConfig.image_upload_max_count)
              .map((url: string, index: number) => ({
                id: `draft-${index}-${url}`,
                fileName: '已上传图片',
                previewUrl: url,
                uploadedUrl: url,
                uploading: false,
              }))
          : []
      );
    } catch {
      storage?.removeItem(draftKey);
    } finally {
      setDraftRestored(true);
    }
  }, [draftKey, draftRestored, editId, loadedEditId, opsConfig.image_upload_max_count]);

  useEffect(() => {
    return () => {
      if (agreementErrorTimer.current) clearTimeout(agreementErrorTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!draftRestored || submitted) return;

    const storage = getStorage();
    if (!storage) return;

    const draft = {
      version: PUBLISH_DRAFT_VERSION,
      listingType,
      title,
      description,
      category,
      ageRange,
      exchangeMode,
      price,
      priceNegotiable,
      condition,
      tags,
      agreementAccepted,
      images: uploadedImages,
      updatedAt: new Date().toISOString(),
    };

    storage.setItem(draftKey, JSON.stringify(draft));
  }, [
    ageRange,
    agreementAccepted,
    category,
    condition,
    description,
    draftKey,
    draftRestored,
    exchangeMode,
    listingType,
    price,
    priceNegotiable,
    submitted,
    tags,
    title,
    uploadedImages,
  ]);

  const addImage = () => {
    if (!currentUser) {
      show('请先登录后再上传图片', 'error');
      router.push('/login');
      return;
    }
    if (!opsSource.image_upload_ready) {
      show('图片存储尚未完成配置，请先补全对象存储参数', 'error');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remaining = opsConfig.image_upload_max_count - images.length;
    const picked = files.slice(0, remaining);

    try {
      const prepared = await Promise.all(
        picked
          .filter((file) => file.type.startsWith('image/'))
          .map(async (file) => ({
            id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            fileName: file.name,
            previewUrl: await readFileAsDataUrl(file),
            uploadedUrl: '',
            uploading: true,
          }))
      );
      setImages((prev) => [...prev, ...prepared]);

      await Promise.all(
        prepared.map(async (item) => {
          try {
            const result = await api.uploads.uploadImage({
              data_url: item.previewUrl,
              file_name: item.fileName,
              category: 'items',
            });
            setImages((prev) =>
              prev.map((entry) =>
                entry.id === item.id
                  ? { ...entry, uploadedUrl: result.data.url, uploading: false }
                  : entry
              )
            );
          } catch (error: any) {
            setImages((prev) =>
              prev.map((entry) =>
                entry.id === item.id
                  ? { ...entry, uploading: false, error: error.message || '上传失败' }
                  : entry
              )
            );
            show('有图片上传失败了，请删除后重新上传', 'error');
          }
        })
      );
    } catch {
      show('图片读取失败，请换一张再试', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((item) => item.id !== id));
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags((prev) => [...prev, trimmed]);
      setTagInput('');
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      show('请先登录后再发布', 'error');
      router.push('/login');
      return;
    }

    if (!agreementAccepted) {
      setAgreementError('请阅读并勾选《用户服务协议》');
      if (agreementErrorTimer.current) clearTimeout(agreementErrorTimer.current);
      agreementErrorTimer.current = setTimeout(() => setAgreementError(''), 3000);
      return;
    }

    setAgreementError('');

    if (!title.trim()) {
      show(isWanted ? '请先填写需求标题' : '请先填写物品标题', 'error');
      return;
    }

    if (!description.trim()) {
      show(isWanted ? '请补充需求描述' : '请补充物品描述', 'error');
      return;
    }

    if (!isWanted && images.length === 0) {
      show('闲置转让至少上传 1 张图片', 'error');
      return;
    }

    if (images.some((item) => item.uploading)) {
      show('图片上传中，请稍等', 'error');
      return;
    }

    if (images.some((item) => !item.uploadedUrl)) {
      show('仍有图片未上传成功，请处理后再发布', 'error');
      return;
    }

    if (exchangeMode === 'sell' && !price.trim()) {
      show(isWanted ? '愿意购买请填写预算' : '定价出售请填写价格', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        images: uploadedImages,
        listingType,
        category,
        ageRange,
        exchangeMode,
        price: exchangeMode === 'sell' ? Number(price) : undefined,
        priceNegotiable: exchangeMode === 'sell' ? priceNegotiable : undefined,
        condition: condition as '全新' | '几乎全新' | '轻微使用' | '正常使用',
        location: {
          community: currentUser.community,
          district: currentUser.district || '',
          lat: userLocation?.lat ?? currentUser.lat ?? 32.0042,
          lng: userLocation?.lng ?? currentUser.lng ?? 112.1227,
        },
        tags,
        agreement_confirmed: true,
        agreement_version: SERVICE_AGREEMENT_VERSION,
      };

      if (isEditing && editId) {
        await api.items.update(editId, {
          ...payload,
          age_range: payload.ageRange,
          exchange_mode: payload.exchangeMode,
          listing_type: payload.listingType,
          price_negotiable: payload.priceNegotiable,
          community: payload.location.community,
          district: payload.location.district,
          lat: payload.location.lat,
          lng: payload.location.lng,
        });
        await refreshItems();
      } else {
        await addItem(payload);
      }
      show(
        isEditing
          ? '已保存并重新发布'
          : isWanted ? '需求发布成功！同片区家长看到后会联系你' : '发布成功！邻居们马上就能看到啦',
        'success'
      );
      setSubmitted(true);
      getStorage()?.removeItem(draftKey);
      setTimeout(() => router.push(isEditing && editId ? `/items/${editId}` : '/'), 1500);
    } catch (err: any) {
      console.error('发布失败:', err);
      if (err?.code === 'LIVE_ANIMAL_FORBIDDEN') {
        show(
          '平台不支持发布或转让宠物、活体动物及相关领养、赠送、交易信息。请不要通过更换称呼或拆分文字继续发布。',
          'error'
        );
        return;
      }
      if (err?.code === 'PROTOCOL_FORBIDDEN') {
        show(err?.message || '发布内容包含平台协议禁止或限制发布的信息，请修改后重新发布', 'error');
        return;
      }
      if (err?.isSensitiveError) {
        // 敏感词拦截 — 显示详细提示
        const words = err.sensitive_words || [];
        show(`⚠️ 内容包含敏感词（${words.join('、')}），请修改后重新发布`, 'error');
      } else {
        const msg = err?.message || '发布失败，请重试';
        show(msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEditItem) {
    return (
      <div className="min-h-screen bg-[#f6f0e5] flex flex-col items-center justify-center px-6">
        <div className="mb-4 text-5xl animate-pulse">📝</div>
        <p className="text-sm text-[#66756d]">正在加载已发布内容...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f6f0e5] flex flex-col items-center justify-center px-6">
        <div className="mb-4 text-6xl">{isEditing ? '✅' : isWanted ? '🔍' : '🎉'}</div>
        <h2 className="mb-2 text-xl font-bold text-[#1c2d24]">{isEditing ? '保存成功！' : '发布成功！'}</h2>
        <p className="text-center text-sm text-[#66756d]">
          {isEditing ? '这条内容已重新发布' : isWanted ? '你的求购需求已发出' : '你的物品已挂上邻里橱窗'}
          <br />
          {isEditing ? '邻居现在可以继续看到它' : isWanted ? '同片区家长有合适的会主动联系你' : '同片区家长很快就能看到啦'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f0e5] pb-[calc(164px+env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[rgba(201,189,171,0.42)] bg-[rgba(255,252,247,0.94)] px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1380px] items-center gap-3">
          <button
            onClick={() => router.back()}
            className="secondary-button flex h-9 w-9 items-center justify-center rounded-full text-[#7b8791] shadow-sm"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="story-title text-[22px] text-[#4a5660]">{isEditing ? '编辑后重新发布' : '发布信息'}</h1>
            {currentUser?.community && (
              <div className="mt-0.5 text-[11px] text-[#8a7d68]">
                发布至：{currentUser.district ? `${currentUser.district} · ` : ''}
                {currentUser.community}
              </div>
            )}
          </div>
          {/* 顶部小按钮保留，主要发布入口在底部浮动按钮 */}
        </div>
      </div>

      <div className="page-shell !pt-4 space-y-3 sm:space-y-4">
        {/* 信息类型 - 闲置转让 vs 求购需求 视觉区分 */}
        <div className={`rounded-[26px] border p-4 shadow-[0_18px_50px_rgba(55,88,71,0.08)] transition-colors sm:rounded-[28px] ${
          isWanted
            ? 'border-[#e8d5b0] bg-[#fffbf5]'
            : 'border-[#eadfca] bg-white/92'
        }`}>
          <p className={`mb-2 text-sm font-semibold ${isWanted ? 'text-[#7a5c2e]' : 'text-[#415449]'}`}>
            🧭 信息类型
          </p>
          <div className="grid grid-cols-2 gap-2">
            {/* 闲置转让 */}
            <button
              key="offer"
              onClick={() => setListingType('offer')}
              className={`rounded-2xl px-3 py-2.5 text-left transition-all sm:px-4 sm:py-3 ${
                listingType === 'offer'
                  ? 'bg-[#1f3a30] text-white shadow-md'
                  : 'bg-[#f0f7f1] text-[#4a6b57] hover:bg-[#e4f0e8]'
              }`}
            >
              <div className="text-sm font-bold">🎁 闲置转让</div>
              <div className={`mt-1 text-[11px] leading-5 sm:text-xs ${listingType === 'offer' ? 'text-white/75' : 'text-[#6b8b7a]'}`}>
                家里闲置，分享给邻里
              </div>
              <div className={`hidden sm:mt-1 sm:block sm:text-[10px] ${listingType === 'offer' ? 'text-white/60' : 'text-[#9aada6]'}`}>
                支持赠送 · 交换 · 出售
              </div>
            </button>

            {/* 求购需求 */}
            <button
              key="wanted"
              onClick={() => setListingType('wanted')}
              className={`rounded-2xl px-3 py-2.5 text-left transition-all sm:px-4 sm:py-3 ${
                listingType === 'wanted'
                  ? 'bg-[#7a3f10] text-white shadow-md'
                  : 'bg-[#fff4e6] text-[#7a5c2e] hover:bg-[#ffe8cc]'
              }`}
            >
              <div className="text-sm font-bold">🔍 求购需求</div>
              <div className={`mt-1 text-[11px] leading-5 sm:text-xs ${listingType === 'wanted' ? 'text-white/75' : 'text-[#a07840]'}`}>
                需要什么，让邻居帮忙
              </div>
              <div className={`hidden sm:mt-1 sm:block sm:text-[10px] ${listingType === 'wanted' ? 'text-white/60' : 'text-[#c4a06a]'}`}>
                如：求教材、求绘本、借推车
              </div>
            </button>
          </div>
        </div>

        <div className="paper-surface rounded-[26px] p-4 shadow-[0_18px_50px_rgba(176,157,135,0.08)] sm:rounded-[30px]">
          <p className="mb-3 text-sm font-semibold text-[#66737d]">
            📸 {isWanted ? '参考图片（选填）' : `添加图片（最多 ${opsConfig.image_upload_max_count} 张）`}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <div className="grid grid-cols-3 gap-2.5 lg:grid-cols-4">
            {images.map((img, index) => (
              <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl">
                <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X size={12} />
                </button>
                {img.uploading && (
                  <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    图片上传中
                  </span>
                )}
                {!img.uploading && img.error && (
                  <span className="absolute left-1 top-1 rounded bg-[#b84d32] px-1.5 py-0.5 text-[10px] font-medium text-white">
                    上传失败
                  </span>
                )}
                {index === 0 && !isWanted && (
                  <span className="absolute bottom-1 left-1 rounded bg-[#1f3a30] px-1.5 py-0.5 text-xs font-medium text-white">
                    封面
                  </span>
                )}
              </div>
            ))}
            {images.length < opsConfig.image_upload_max_count && (
              <button
                onClick={addImage}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#d9d2c5] bg-[#fffaf4] text-[#8b96a0] transition-colors active:border-[#a8c3b1]"
              >
                <Camera size={22} />
                <span className="text-xs">{isWanted ? '上传参考图' : '添加图片'}</span>
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-[#98a2aa]">
            {isWanted
              ? '求购信息可以不传图；如果有教材封面、版本页或示意图，会更容易被准确回应。'
              : '第一张图片将作为封面，建议在自然光下拍摄，效果更好。'}
          </p>
        </div>

        <div className="paper-surface space-y-4 rounded-[30px] p-4 shadow-[0_18px_50px_rgba(176,157,135,0.08)]">
          <div>
            <p className="mb-2 text-sm font-semibold text-[#66737d]">✏️ 标题</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isWanted
                  ? '例如：求三年级上册数学教材，假期预习用'
                  : '例如：费雪婴儿健身架，适合 0-6 月宝宝'
              }
              className="soft-input w-full rounded-xl px-3 py-2.5 text-sm text-[#4b5862]"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-[#66737d]">📝 描述</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isWanted
                  ? '写清楚需要的物品、版本/年级/出版社、期望新旧程度、最晚什么时候需要，以及愿意购买还是接受赠送。'
                  : '详细描述一下物品的品牌、型号、使用情况、适合什么样的孩子。'
              }
              rows={4}
              className="soft-input w-full resize-none rounded-xl px-3 py-2.5 text-sm text-[#4b5862]"
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-[#eadfca] bg-white/92 p-4 shadow-[0_18px_50px_rgba(55,88,71,0.08)]">
          <p className="mb-3 text-sm font-semibold text-[#415449]">📦 分类</p>
          <div className="grid grid-cols-3 gap-2">
            {categories.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`rounded-xl py-2 text-xs font-medium transition-colors ${
                  category === key ? 'bg-[#1f3a30] text-white' : 'bg-[#f8f3ea] text-[#5e6f66]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#eadfca] bg-white/92 p-4 shadow-[0_18px_50px_rgba(55,88,71,0.08)]">
          <p className="mb-3 text-sm font-semibold text-[#415449]">👶 适用年龄</p>
          <div className="grid grid-cols-3 gap-2">
            {ages.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setAgeRange(key)}
                className={`rounded-xl py-2 text-xs font-medium transition-colors ${
                  ageRange === key ? 'bg-[#1f3a30] text-white' : 'bg-[#f8f3ea] text-[#5e6f66]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!isWanted && (
          <div className="rounded-[28px] border border-[#eadfca] bg-white/92 p-4 shadow-[0_18px_50px_rgba(55,88,71,0.08)]">
            <p className="mb-3 text-sm font-semibold text-[#415449]">✨ 物品成色</p>
            <div className="grid grid-cols-2 gap-2">
              {conditions.map((itemCondition) => (
                <button
                  key={itemCondition}
                  onClick={() => setCondition(itemCondition)}
                  className={`rounded-xl py-2.5 text-xs font-medium transition-colors ${
                    condition === itemCondition ? 'bg-[#1f3a30] text-white' : 'bg-[#f8f3ea] text-[#5e6f66]'
                  }`}
                >
                  {itemCondition}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[28px] border border-[#eadfca] bg-white/92 p-4 shadow-[0_18px_50px_rgba(55,88,71,0.08)]">
          <p className="mb-3 text-sm font-semibold text-[#415449]">
            🤝 {isWanted ? '希望如何获得' : '流转方式'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {EXCHANGE_MODE_OPTIONS.map((mode) => (
              <button
                key={mode}
                onClick={() => setExchangeMode(mode)}
                className={`rounded-xl px-2 py-2.5 text-xs font-medium transition-colors ${
                  exchangeMode === mode ? 'bg-[#1f3a30] text-white' : 'bg-[#f8f3ea] text-[#5e6f66]'
                }`}
              >
                {getExchangeModeLabel(mode, listingType)}
              </button>
            ))}
          </div>
          {exchangeMode === 'sell' && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center rounded-xl bg-[#f8f3ea] px-3 py-2.5">
                <span className="mr-1 text-sm text-[#8c7d63]">¥</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={isWanted ? '可接受预算' : '请输入价格'}
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                />
                <span className="text-sm text-[#8c7d63]">元</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {priceOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPriceNegotiable(option)}
                    className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                      priceNegotiable === option
                        ? 'bg-[#1f3a30] text-white'
                        : 'bg-[#f8f3ea] text-[#6f7d74]'
                    }`}
                  >
                    {getPriceNegotiableLabel(option, listingType)}
                  </button>
                ))}
              </div>
              <p className="text-xs leading-5 text-[#98a2aa]">
                {isWanted
                  ? '预算固定表示不方便再加价；预算可协商表示可以根据新旧程度再谈。'
                  : '一口价表示价格明确；可小刀表示接受邻居合理商量。'}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-[#eadfca] bg-white/92 p-4 shadow-[0_18px_50px_rgba(55,88,71,0.08)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#415449]">🏷️ 标签</p>
            <span className="text-xs text-[#98a2aa]">{tags.length}/5</span>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {presetTags.map((preset) => {
              const selected = tags.includes(preset);
              return (
                <button
                  key={preset}
                  disabled={!selected && tags.length >= 5}
                  onClick={() =>
                    selected
                      ? setTags((prev) => prev.filter((t) => t !== preset))
                      : setTags((prev) => [...prev, preset])
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-[#1f3a30] text-white'
                      : 'bg-[#f3ede2] text-[#5e6f66] disabled:opacity-40'
                  }`}
                >
                  {selected ? `✓ ${preset}` : preset}
                </button>
              );
            })}
          </div>
          {tags.length < 5 && (
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder={isWanted ? '补充版本、年级、出版社…' : '自定义标签，如品牌名…'}
                className="flex-1 rounded-xl bg-[#f8f3ea] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6ab62]/35"
              />
              <button
                onClick={addTag}
                className="rounded-xl bg-[#eef4ef] px-4 text-sm font-medium text-[#1f3a30]"
              >
                添加
              </button>
            </div>
          )}
        </div>

        <div className="rounded-[24px] border border-[#d9e6dd] bg-[#f7fbf4] px-4 py-3 text-xs leading-6 text-[#5d6b63]">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => {
                setAgreementAccepted((prev) => {
                  const next = !prev;
                  if (next) {
                    setAgreementError('');
                    if (agreementErrorTimer.current) clearTimeout(agreementErrorTimer.current);
                  }
                  return next;
                });
              }}
              onPointerDown={() => {}}
              aria-pressed={agreementAccepted}
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${
                agreementAccepted
                  ? 'border-[#1f3a30] bg-[#1f3a30] text-white'
                  : 'border-[#9fb3a6] bg-white text-transparent'
              }`}
            >
              ✓
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#365447]">发布前请确认</p>
              <p className="mt-1 leading-6">
                我已确认本次{isWanted ? '求购' : '发布'}遵守
                <Link
                  href="/terms/user-service-agreement?from=publish"
                  target="_blank"
                  className="mx-1 font-semibold text-[#1f3a30] underline underline-offset-2"
                >
                  《用户服务协议》
                </Link>
                ，并确认：
              </p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 leading-6">
                {publishConfirmationBullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* 底部浮动发布按钮 */}
      <div className="fixed inset-x-0 bottom-[86px] z-[60] px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-[720px]">
          {agreementError && (
            <div className="mb-2 rounded-2xl border border-[#f0c5bd] bg-[#fff4f1] px-4 py-2 text-center text-xs font-semibold text-[#b85342] shadow-[0_12px_28px_rgba(184,91,68,0.12)]">
              {agreementError}
            </div>
          )}
          <div className="rounded-full bg-[rgba(255,252,247,0.86)] p-1.5 shadow-[0_18px_46px_rgba(70,64,54,0.18)] backdrop-blur-xl">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`primary-button flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold ${
              !agreementAccepted || !title.trim() || !description.trim()
                ? 'bg-[#9bb8a5] text-white/95'
                : ''
            }`}
            onPointerDown={() => {}}
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {isEditing ? '保存中...' : '发布中...'}
              </>
            ) : isEditing ? (
              <>✅ 保存并重新发布</>
            ) : isWanted ? (
              <>🔍 发布求购需求</>
            ) : (
              <>🎁 发布闲置</>
            )}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
