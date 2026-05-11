'use client';

import Link from 'next/link';
import { ChevronLeft, FileText } from 'lucide-react';

import { publishAgreementSections, PUBLISH_AGREEMENT_VERSION } from '@/data/publishAgreement';

export default function PublishAgreementPage() {
  return (
    <div className="min-h-screen">
      <div className="page-shell">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            aria-label="返回"
          >
            <ChevronLeft size={18} className="text-[#5d6b63]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#1c2d24]">童邻市集 · 用户发布协议</h1>
            <p className="mt-0.5 text-xs text-[#8c949c]">版本：{PUBLISH_AGREEMENT_VERSION}</p>
          </div>
        </div>

        <section className="paper-surface rounded-[32px] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef6f0] text-[#3d6b57]">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#344238]">发布前请完整阅读本协议。</p>
              <p className="mt-2 text-xs leading-6 text-[#7f8890]">
                点击“同意并发布”即表示您已充分阅读、理解并接受本协议条款。
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 space-y-3">
          {publishAgreementSections.map((section) => (
            <div key={section.title} className="rounded-[26px] border border-[#eadfca] bg-white/88 px-4 py-4 shadow-[0_12px_28px_rgba(176,157,135,0.06)]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f7f1] text-[#3d6b57]">
                  <FileText size={14} />
                </span>
                <h2 className="text-sm font-bold text-[#4b5862]">{section.title}</h2>
              </div>
              <div className="mt-2 space-y-2 text-sm leading-7 text-[#687681]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="mt-5 flex justify-center">
          <Link href="/terms/trade-safety" className="rounded-full bg-[#eef4ef] px-5 py-3 text-sm font-bold text-[#1f3a30]">
            查看《交易安全须知》
          </Link>
        </div>
      </div>
    </div>
  );
}
