'use client';

import Link from 'next/link';
import { ChevronLeft, FileText, ShieldCheck } from 'lucide-react';

import {
  publishAgreementSections,
  PUBLISH_AGREEMENT_VERSION,
  tradeSafetyTips,
} from '@/data/publishAgreement';

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <div className="page-shell">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/profile" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <ChevronLeft size={18} className="text-[#5d6b63]" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#1c2d24]">用户发布协议与交易安全须知</h1>
            <p className="mt-0.5 text-xs text-[#8c949c]">版本：{PUBLISH_AGREEMENT_VERSION}</p>
          </div>
        </div>

        <section className="paper-surface rounded-[32px] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef6f0] text-[#3d6b57]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#344238]">平台仅提供邻里信息展示、沟通与预约工具。</p>
              <p className="mt-2 text-xs leading-6 text-[#7f8890]">
                平台不参与交易、不提供担保；发布前请确认物品来源合法、描述真实完整，线下面交前请自行核实物品情况、交付方式和安全细节。
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

        <section className="mt-4 rounded-[26px] border border-[#d9e6dd] bg-[#f7fbf4] px-4 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-[#3d6b57]" />
            <h2 className="text-sm font-bold text-[#365447]">交易安全须知</h2>
          </div>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-[#5d6b63]">
            {tradeSafetyTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ol>
        </section>

        <section className="mt-4 rounded-[26px] border border-[#f0dfbf] bg-[#fff8ec] px-4 py-4">
          <p className="text-sm font-bold text-[#7a5c28]">遇到问题怎么办？</p>
          <p className="mt-2 text-sm leading-7 text-[#7f6b4b]">
            如遇虚假信息、危险物品、纠纷或不友好沟通，请保留截图与沟通记录，并通过投诉与建议提交。平台会结合规则协助处理。
          </p>
          <Link href="/feedback" className="mt-3 inline-flex rounded-full bg-[#1f3a30] px-4 py-2 text-xs font-semibold text-white">
            去反馈
          </Link>
        </section>
      </div>
    </div>
  );
}
