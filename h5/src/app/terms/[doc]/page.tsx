import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, ChevronLeft } from 'lucide-react';

import { ServiceDocumentKey } from '@/data/serviceAgreement';
import { loadServiceAgreementContent } from '@/data/serviceAgreementRuntime';

export const dynamic = 'force-dynamic';

const LEGACY_DOCS: Record<string, ServiceDocumentKey> = {
  'platform-disclaimer': 'user-service-agreement',
  'idle-publish-rules': 'user-service-agreement',
  'wanted-publish-rules': 'user-service-agreement',
  'provider-commitment': 'user-service-agreement',
  'trade-safety': 'user-service-agreement',
};

function isSectionTitle(text: string) {
  return /^(【.+】|[一二三四五六七八九十]+、|（[一二三四五六七八九十]+）)/.test(text.trim());
}

export default async function ServiceDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ doc: string }>;
  searchParams: Promise<{ from?: string; return_to?: string }>;
}) {
  const { doc } = await params;
  const { from, return_to } = await searchParams;
  const { documents, version } = await loadServiceAgreementContent();
  const docKey = (documents[doc as ServiceDocumentKey] ? doc : LEGACY_DOCS[doc]) as ServiceDocumentKey;
  const document = documents[docKey];
  if (!document) notFound();
  const safeReturnTo = return_to && return_to.startsWith('/') && !return_to.startsWith('//') ? return_to : '';
  const backHref = safeReturnTo || (from === 'login' ? '/login' : from === 'publish' ? '/publish' : '/profile');
  const backLabel = from === 'login' ? '返回注册/登录' : from === 'publish' ? '返回发布' : from === 'agreement-update' ? '返回继续使用' : '返回我的';

  return (
    <div className="min-h-screen">
      <div className="page-shell">
        <div className="mb-5 flex items-center gap-3">
          <Link href={backHref} aria-label={backLabel} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <ChevronLeft size={18} className="text-[#5d6b63]" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#1c2d24]">童邻市集 · {document.title}</h1>
            <p className="mt-0.5 text-xs text-[#8c949c]">版本：{version}</p>
          </div>
        </div>

        <article className="paper-surface rounded-[30px] px-5 py-6">
          <div className="space-y-4 text-sm leading-8 text-[#5f6d66]">
            {document.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className={isSectionTitle(paragraph) ? 'pt-2 text-base font-black leading-8 text-[#26382f]' : undefined}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        {docKey === 'user-service-agreement' && (from === 'login' || from === 'agreement-update') && (
          <div className="sticky bottom-[82px] z-[30] mt-4 pb-[env(safe-area-inset-bottom)]">
            <Link
              href={backHref}
              className="primary-button flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold shadow-[0_18px_46px_rgba(70,64,54,0.18)]"
            >
              <CheckCircle2 size={18} />
              {from === 'agreement-update' ? '已阅读，返回继续使用' : '已阅读，返回注册/登录'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
