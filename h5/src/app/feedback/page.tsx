'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const TYPES = ['建议', '举报投诉', '物品问题', '其他'] as const;

export default function FeedbackPage() {
  const router = useRouter();
  const { show } = useToast();
  const [type, setType] = useState<string>('建议');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (content.trim().length < 5) {
      show('请详细描述（至少5个字）', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.feedback.submit({ type, content: content.trim(), contact: contact.trim() });
      setDone(true);
    } catch {
      show('提交失败，请稍后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#f5f0e8]">
        <div className="page-shell flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl">🌿</div>
          <h2 className="story-title mt-6 text-[26px] text-[#3d5c4a]">已收到，谢谢你</h2>
          <p className="mt-3 max-w-[28ch] text-sm leading-7 text-[#6d8070]">
            我们会认真看每一条反馈，平台因你变得更好。
          </p>
          <button
            onClick={() => router.back()}
            className="mt-8 rounded-full bg-[#3d5c4a] px-8 py-3 text-sm font-semibold text-white"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <div className="page-shell max-w-lg">
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ChevronLeft size={18} className="text-[#5d6b63]" />
          </button>
          <h1 className="text-xl font-bold text-[#1c2d24]">投诉与建议</h1>
        </div>

        <div className="space-y-4">
          {/* 类型选择 */}
          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-[#4b5862]">反馈类型</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? 'bg-[#3d5c4a] text-white'
                      : 'border border-[#d9e0d6] bg-white text-[#5d6b63]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 内容 */}
          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-[#4b5862]">
              详细描述 <span className="font-normal text-[#e07a5f]">*</span>
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                type === '举报投诉' ? '请描述遇到的问题，越详细越好...' :
                type === '建议' ? '你希望平台增加或改进什么？' :
                type === '物品问题' ? '关于哪件物品？遇到了什么情况？' :
                '有什么想说的，直接写...'
              }
              maxLength={500}
              className="h-36 w-full resize-none rounded-2xl bg-[#f7f2ea] p-3 text-sm text-[#3d4a42] focus:outline-none focus:ring-2 focus:ring-[#a8c3b1]/40"
            />
            <p className="mt-1.5 text-right text-xs text-[#a0a8a4]">{content.length}/500</p>
          </div>

          {/* 联系方式（选填） */}
          <div className="rounded-[28px] bg-white p-5 shadow-sm">
            <p className="mb-1 text-sm font-semibold text-[#4b5862]">联系方式（选填）</p>
            <p className="mb-3 text-xs leading-5 text-[#8c949c]">
              登录用户可在消息通知中收到处理回复；未登录且不留联系方式时，我们仍会处理，但无法主动反馈结果。
            </p>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="手机号或微信"
              className="w-full rounded-2xl bg-[#f7f2ea] px-4 py-3 text-sm text-[#3d4a42] focus:outline-none focus:ring-2 focus:ring-[#a8c3b1]/40"
            />
          </div>

          <button
            onClick={handleSubmit}
            onPointerDown={() => {}}
            disabled={submitting || content.trim().length < 5}
            className="relative z-10 w-full rounded-full bg-[#3d5c4a] py-3.5 text-sm font-bold text-white shadow-sm active:brightness-90 disabled:opacity-50"
          >
            {submitting ? '提交中...' : '提交反馈'}
          </button>

          <p className="pb-4 text-center text-xs text-[#a0a8a4]">
            每一条反馈我们都会认真阅读
          </p>
        </div>
      </div>
    </div>
  );
}
