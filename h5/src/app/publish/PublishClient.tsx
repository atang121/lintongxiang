'use client';

import { ChangeEvent, useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, ChevronLeft, MapPin, X } from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { compressImage } from '@/lib/imageCompress';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { locationService, XIANGYANG_CENTER } from '@/lib/tencentMap';
import { CommunityPicker } from '@/components/CommunityPicker';
import {
  AGE_LABELS,
  AgeRange,
  CATEGORY_LABELS,
  ExchangeMode,
  getExchangeModeLabel,
  ItemCategory,
  LISTING_TYPE_LABELS,
  ListingType,
} from '@/types';

type UploadImageState = {
  id: string;
  fileName: string;
  previewUrl: string; // 压缩后的预览图（用于显示）
  compressedSize?: number; // 压缩后的大小（用于显示）
  uploadedUrl: string;
  uploading: boolean;
  error?: string;
};

const EXCHANGE_MODE_OPTIONS: ExchangeMode[] = ['gift', 'swap', 'sell'];

export function PublishClient() {
  const router = useRouter();
  const { addItem, currentUser, opsConfig, opsSource, communityOptions } = useApp();
  const { show } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { keyboardHeight, isKeyboardOpen } = useKeyboardHeight();

  const [images, setImages] = useState<UploadImageState[]>([]);
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const initialType: ListingType = typeParam === 'wanted' ? 'wanted' : 'offer';
  const [listingType, setListingType] = useState<ListingType>(initialType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ItemCategory>('toy');
  const [ageRange, setAgeRange] = useState<AgeRange>('0-3');
  const [exchangeMode, setExchangeMode] = useState<ExchangeMode>('gift');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<string>('轻微使用');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // 发布位置状态：统一使用社区数据库标准坐标
  const [publishLocation, setPublishLocation] = useState<{
    community: string;
    district: string;
    lat: number;
    lng: number;
    isCustom: boolean;
  }>(() => {
    const name = currentUser?.community || '';
    const match = communityOptions.find((c) => c.name === name);
    return {
      community: name,
      district: currentUser?.district || '',
      lat: match?.lat ?? XIANGYANG_CENTER.lat,
      lng: match?.lng ?? XIANGYANG_CENTER.lng,
      isCustom: false,
    };
  });

  // 是否展开小区选择器
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);

  // GPS 检测到的小区名（用于提示，不直接用于提交）
  const [detectedCommunity, setDetectedCommunity] = useState<string | null>(null);

  // 挂载时用 GPS + 逆地址解析检测当前位置
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    locationService.getCurrentPosition().then((result) => {
      if (cancelled) return;
      if (result.community && result.community !== currentUser.community) {
        setDetectedCommunity(result.community);
      }
    });
    return () => { cancelled = true; };
  }, [currentUser]);

  // 处理小区选择
  const handleCommunityChange = (selection: { community: string; district: string; isCustom: boolean }) => {
    const match = communityOptions.find((c) => c.name === selection.community);
    setPublishLocation({
      community: selection.community,
      district: selection.district,
      lat: match?.lat ?? XIANGYANG_CENTER.lat,
      lng: match?.lng ?? XIANGYANG_CENTER.lng,
      isCustom: selection.isCustom,
    });
    setShowCommunityPicker(false);
  };

  const conditions = ['全新', '几乎全新', '轻微使用', '正常使用'];
  const categories = Object.entries(CATEGORY_LABELS) as [ItemCategory, string][];
  const ages = Object.entries(AGE_LABELS) as [AgeRange, string][];

  const isWanted = listingType === 'wanted';
  const uploadedImages = images.filter((item) => item.uploadedUrl).map((item) => item.uploadedUrl);
  const presetTags = isWanted
    ? ['教材求购', '可接受旧版', '假期预习', '同小区优先', '可上门自取', '可购买', '可获赠', '急需']
    : ['配件齐全', '有说明书', '品牌正品', '自提优先', '孩子长大了', '国外带回', '可验货', '赠品'];

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

  /**
   * 上传单张图片（带自动重试）
   */
  const uploadSingleImage = async (item: UploadImageState, maxRetries = 2): Promise<string> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await api.uploads.uploadImage({
          data_url: item.previewUrl,
          file_name: item.fileName,
          category: 'items',
        });
        return result.data.url;
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const msg = error?.message || '';

        // 如果是最后一次尝试或者是非网络错误，不再重试
        if (isLastAttempt || (!msg.includes('fetch') && !msg.includes('network') && !msg.includes('timeout'))) {
          throw error;
        }

        // 网络错误，等待一下再重试
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw new Error('上传失败');
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remaining = opsConfig.image_upload_max_count - images.length;
    const picked = files.slice(0, remaining).filter((file) => file.type.startsWith('image/'));

    if (picked.length === 0) {
      event.target.value = '';
      return;
    }

    try {
      // 第一步：客户端压缩所有图片（快速完成，用户看到预览）
      const prepared: UploadImageState[] = [];
      for (const file of picked) {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        try {
          // 压缩图片（最大宽度 1200px，质量 85%）
          const compressed = await compressImage(file, 1200, 0.85);

          prepared.push({
            id,
            fileName: file.name,
            previewUrl: compressed.dataUrl,
            compressedSize: compressed.size,
            uploadedUrl: '',
            uploading: true,
          });
        } catch {
          // 压缩失败时，使用原始文件（作为降级方案）
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          prepared.push({
            id,
            fileName: file.name,
            previewUrl: dataUrl,
            uploadedUrl: '',
            uploading: true,
          });
        }
      }

      setImages((prev) => [...prev, ...prepared]);

      // 第二步：顺序上传（避免并发过多导致失败）
      let hasError = false;
      for (const item of prepared) {
        try {
          const url = await uploadSingleImage(item);
          setImages((prev) =>
            prev.map((entry) =>
              entry.id === item.id
                ? { ...entry, uploadedUrl: url, uploading: false }
                : entry
            )
          );
        } catch (error: any) {
          hasError = true;
          const msg = error?.message || '';
          const isSizeError = msg.includes('413') || msg.includes('payload') || msg.includes('body') || msg.includes('过大');

          setImages((prev) =>
            prev.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    uploading: false,
                    error: isSizeError
                      ? `图片过大（已自动压缩，如仍失败请用微信压缩）`
                      : '上传失败，点击重试',
                  }
                : entry
            )
          );
        }
      }

      if (hasError) {
        show('部分图片上传失败，可删除后重试', 'error');
      }
    } catch {
      show('图片处理失败，请换一张再试', 'error');
    } finally {
      event.target.value = '';
    }
  };

  /**
   * 删除图片，或点击失败图片时重试
   */
  const handleImageClick = async (item: UploadImageState) => {
    if (item.error && !item.uploading) {
      // 点击失败图片 → 重试上传
      setImages((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? { ...entry, uploading: true, error: undefined }
            : entry
        )
      );
      try {
        const url = await uploadSingleImage(item);
        setImages((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? { ...entry, uploadedUrl: url, uploading: false }
              : entry
          )
        );
      } catch (error: any) {
        setImages((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? { ...entry, uploading: false, error: '上传失败，点击重试' }
              : entry
          )
        );
      }
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
      await addItem({
        title: title.trim(),
        description: description.trim(),
        images: uploadedImages,
        listingType,
        category,
        ageRange,
        exchangeMode,
        price: exchangeMode === 'sell' ? Number(price) : undefined,
        condition: condition as '全新' | '几乎全新' | '轻微使用' | '正常使用',
        location: {
          community: publishLocation.community,
          district: publishLocation.district,
          lat: publishLocation.lat,
          lng: publishLocation.lng,
        },
        tags,
      });
      show(isWanted ? '需求发布成功！附近家长看到后会联系你' : '发布成功！邻居们马上就能看到啦', 'success');
      setSubmitted(true);
      setTimeout(() => router.push('/'), 1500);
    } catch {
      show('发布失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f6f0e5] flex flex-col items-center justify-center px-6">
        <div className="mb-4 text-6xl">{isWanted ? '🔍' : '🎉'}</div>
        <h2 className="mb-2 text-xl font-bold text-[#1c2d24]">发布成功！</h2>
        <p className="text-center text-sm text-[#66756d]">
          {isWanted ? '你的求购需求已发出' : '你的物品已挂上邻里橱窗'}
          <br />
          {isWanted ? '附近家长有合适的会主动联系你' : '附近家长很快就能看到啦'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f6f0e5]"
      style={{ paddingBottom: isKeyboardOpen ? `${keyboardHeight + 72}px` : '144px' }}
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[rgba(201,189,171,0.42)] bg-[rgba(255,252,247,0.94)] px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1380px] items-center gap-3">
          <button
            onClick={() => router.back()}
            className="secondary-button flex h-9 w-9 items-center justify-center rounded-full text-[#7b8791] shadow-sm"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="story-title text-[22px] text-[#4a5660]">发布信息</h1>
            {publishLocation.community && (
              <div className="mt-0.5 text-[11px] text-[#8a7d68]">
                发布至：{publishLocation.district ? `${publishLocation.district} · ` : ''}
                {publishLocation.community}
              </div>
            )}
          </div>
          {/* 顶部小按钮保留，主要发布入口在底部浮动按钮 */}
        </div>
      </div>

      <div className="page-shell !pt-4 space-y-4">
        {/* 信息类型 - 闲置转让 vs 求购需求 视觉区分 */}
        <div className={`rounded-[28px] border p-4 shadow-[0_18px_50px_rgba(55,88,71,0.08)] transition-colors ${
          isWanted
            ? 'border-[#e8d5b0] bg-[#fffbf5]'
            : 'border-[#eadfca] bg-white/92'
        }`}>
          <p className={`mb-3 text-sm font-semibold ${isWanted ? 'text-[#7a5c2e]' : 'text-[#415449]'}`}>
            🧭 信息类型
          </p>
          <div className="grid grid-cols-2 gap-2">
            {/* 闲置转让 */}
            <button
              key="offer"
              onClick={() => setListingType('offer')}
              className={`rounded-2xl px-4 py-3 text-left transition-all ${
                listingType === 'offer'
                  ? 'bg-[#1f3a30] text-white shadow-md'
                  : 'bg-[#f0f7f1] text-[#4a6b57] hover:bg-[#e4f0e8]'
              }`}
            >
              <div className="text-sm font-bold">🎁 闲置转让</div>
              <div className={`mt-1 text-xs ${listingType === 'offer' ? 'text-white/75' : 'text-[#6b8b7a]'}`}>
                家里闲置，分享给邻里
              </div>
              <div className={`mt-1 text-[10px] ${listingType === 'offer' ? 'text-white/60' : 'text-[#9aada6]'}`}>
                支持赠送 · 交换 · 出售
              </div>
            </button>

            {/* 求购需求 */}
            <button
              key="wanted"
              onClick={() => setListingType('wanted')}
              className={`rounded-2xl px-4 py-3 text-left transition-all ${
                listingType === 'wanted'
                  ? 'bg-[#7a3f10] text-white shadow-md'
                  : 'bg-[#fff4e6] text-[#7a5c2e] hover:bg-[#ffe8cc]'
              }`}
            >
              <div className="text-sm font-bold">🔍 求购需求</div>
              <div className={`mt-1 text-xs ${listingType === 'wanted' ? 'text-white/75' : 'text-[#a07840]'}`}>
                需要什么，让邻居帮忙
              </div>
              <div className={`mt-1 text-[10px] ${listingType === 'wanted' ? 'text-white/60' : 'text-[#c4a06a]'}`}>
                如：求教材、求绘本、借推车
              </div>
            </button>
          </div>
        </div>

        {/* 位置确认区段 */}
        <div className={`rounded-[28px] border p-4 shadow-[0_18px_50px_rgba(55,88,71,0.08)] transition-colors ${
          showCommunityPicker
            ? 'border-[#a8c3b1] bg-[#f0f7f2]'
            : 'border-[#eadfca] bg-white/92'
        }`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#415449]">📍 物品位置</p>
            <button
              onClick={() => setShowCommunityPicker(!showCommunityPicker)}
              className="flex items-center gap-1 text-xs text-[#7a9b86] hover:text-[#5f806f]"
            >
              <MapPin size={13} />
              {publishLocation.community ? '切换小区' : '选择小区'}
            </button>
          </div>

          {!showCommunityPicker ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                {publishLocation.community ? (
                  <div>
                    <div className="text-sm font-medium text-[#1c2d24]">
                      {publishLocation.community}
                    </div>
                    {detectedCommunity && detectedCommunity !== publishLocation.community && (
                      <div className="mt-1 text-xs text-[#8a938d]">
                        GPS 检测到附近有「{detectedCommunity}」，如不在此小区可切换
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-[#8a938d]">
                    点击"选择小区"指定物品所在位置
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <CommunityPicker
                value={publishLocation.community}
                districtValue={publishLocation.district}
                onChange={handleCommunityChange}
                communityOptions={communityOptions}
              />
            </div>
          )}
        </div>

        <div className="paper-surface rounded-[30px] p-4 shadow-[0_18px_50px_rgba(176,157,135,0.08)]">
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
                {/* 点击失败图片重试 */}
                <div
                  onClick={() => void handleImageClick(img)}
                  className={`h-full w-full ${img.error ? 'cursor-pointer' : ''}`}
                >
                  <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X size={12} />
                </button>
                {img.uploading && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/30">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-white" />
                    </div>
                    <span className="mt-1 block text-center text-[10px] font-medium text-white">
                      压缩上传中
                    </span>
                  </div>
                )}
                {!img.uploading && img.error && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#b84d32] to-transparent p-1.5">
                    <span className="block text-center text-[10px] font-medium text-white">
                      {img.error}
                    </span>
                  </div>
                )}
                {!img.uploading && !img.error && img.compressedSize && (
                  <span className="absolute left-1 top-1 rounded bg-black/45 px-1 py-0.5 text-[9px] font-medium text-white/80">
                    {(img.compressedSize / 1024).toFixed(0)}KB
                  </span>
                )}
                {index === 0 && !isWanted && (
                  <span className="absolute bottom-1 right-1 rounded bg-[#1f3a30] px-1.5 py-0.5 text-xs font-medium text-white">
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
              : `第一张图片将作为封面，建议在自然光下拍摄，效果更好。支持 JPG/PNG/WebP，建议每张不超过 ${opsConfig.image_upload_max_mb}MB，最多 ${opsConfig.image_upload_max_count} 张。`}
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
            🤝 {isWanted ? '希望对方如何回应' : '流转方式'}
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
            <div className="mt-3">
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
      </div>

      {/* 底部浮动发布按钮：键盘弹出时上移至键盘上方 */}
      <div
        className="fixed inset-x-0 z-[60] border-t border-[rgba(201,189,171,0.42)] bg-[rgba(255,252,247,0.96)] px-4 pt-3 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] transition-[bottom] duration-200"
        style={{
          bottom: isKeyboardOpen
            ? `${keyboardHeight}px`
            : `calc(72px + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: isKeyboardOpen ? '12px' : 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="mx-auto max-w-[1380px]">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || submitting}
            className="primary-button flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold disabled:bg-[#c9c3b6]"
            onPointerDown={() => {}}
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                发布中...
              </>
            ) : isWanted ? (
              <>🔍 发布求购需求</>
            ) : (
              <>🎁 发布闲置</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
