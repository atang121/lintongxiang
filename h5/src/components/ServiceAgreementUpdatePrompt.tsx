'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, ShieldCheck } from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/context/AppContext';
import { SERVICE_AGREEMENT_VERSION } from '@/data/serviceAgreement';

export const SERVICE_AGREEMENT_REQUIRED_EVENT = 'tonglin:service-agreement-required';

function buildReturnPath(pathname: string) {
  if (!pathname || pathname.startsWith('/login') || pathname.startsWith('/terms')) return '/profile';
  return pathname;
}

export default function ServiceAgreementUpdatePrompt() {
  const pathname = usePathname();
  const { currentUser, acceptServiceAgreement } = useApp();
  const { show } = useToast();
  const [forcedVisible, setForcedVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleRequired = () => setForcedVisible(true);
    window.addEventListener(SERVICE_AGREEMENT_REQUIRED_EVENT, handleRequired);
    return () => window.removeEventListener(SERVICE_AGREEMENT_REQUIRED_EVENT, handleRequired);
  }, []);

  const hiddenOnThisPage = pathname.startsWith('/login') || pathname.startsWith('/terms');
  const shouldShow = Boolean(currentUser && !hiddenOnThisPage && (currentUser.serviceAgreementRequired || forcedVisible));
  const agreementHref = useMemo(() => {
    const returnTo = encodeURIComponent(buildReturnPath(pathname));
    return `/terms/user-service-agreement?from=agreement-update&return_to=${returnTo}`;
  }, [pathname]);

  const handleAccept = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await acceptServiceAgreement('agreement_update_prompt');
      setForcedVisible(false);
      show('已确认最新用户服务协议，可以继续使用', 'success');
    } catch (error: any) {
      show(error?.message || '协议确认失败，请稍后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/38 px-4 pb-[max(18px,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center">
      <div className="w-full max-w-[420px] rounded-[30px] border border-[#eadfca] bg-[#fffdf8] p-5 shadow-[0_28px_80px_rgba(31,45,38,0.24)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef6f0] text-[#3d6b57]">
            <ShieldCheck size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-base font-black text-[#1f2d26]">用户服务协议已更新</p>
            <p className="mt-1 text-xs leading-5 text-[#8c7d63]">版本：{SERVICE_AGREEMENT_VERSION}</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-[#5f6d66]">
          为了继续发送私信、预约、发布或响应需求，请先阅读并确认最新版《童邻市集用户服务协议》。确认后无需重新登录。
        </p>

        <div className="mt-4 rounded-2xl bg-[#f7f0e6] px-3 py-3 text-xs leading-6 text-[#756d62]">
          平台仅提供邻里信息展示、沟通与预约工具；不参与交易、不提供担保。更新确认会记录在你的账号中。
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            href={agreementHref}
            className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border border-[#e2d6c3] bg-white px-3 text-sm font-bold text-[#5f6d66]"
          >
            <FileText size={16} />
            查看协议
          </Link>
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={submitting}
            className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-[#1f3a30] px-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            {submitting ? '确认中' : '同意并继续'}
          </button>
        </div>
      </div>
    </div>
  );
}
