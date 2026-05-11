'use client';

import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';

import { PUBLISH_AGREEMENT_VERSION, tradeSafetyTips } from '@/data/publishAgreement';

export default function TradeSafetyPage() {
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
            <h1 className="text-xl font-bold text-[#1c2d24]">童邻市集 · 交易安全须知</h1>
            <p className="mt-0.5 text-xs text-[#8c949c]">版本：{PUBLISH_AGREEMENT_VERSION}</p>
          </div>
        </div>

        <section className="paper-surface rounded-[32px] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef6f0] text-[#3d6b57]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#344238]">平台不参与交易、不提供担保。</p>
              <p className="mt-2 text-xs leading-6 text-[#7f8890]">
                请优先选择小区公共区域面交，现场核实物品状态后再完成交付。
              </p>
            </div>
          </div>
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
          <p className="text-sm font-bold text-[#7a5c28]">发现异常怎么办？</p>
          <p className="mt-2 text-sm leading-7 text-[#7f6b4b]">
            如遇虚假信息、危险物品、纠纷或不友好沟通，请保留截图与沟通记录，并通过投诉与建议提交。
          </p>
          <Link href="/feedback" className="mt-3 inline-flex rounded-full bg-[#1f3a30] px-4 py-2 text-xs font-semibold text-white">
            去反馈
          </Link>
        </section>

        <div className="mt-5 flex justify-center">
          <Link href="/terms/publish-agreement" className="rounded-full bg-[#eef4ef] px-5 py-3 text-sm font-bold text-[#1f3a30]">
            查看《用户发布协议》
          </Link>
        </div>
      </div>
    </div>
  );
}
