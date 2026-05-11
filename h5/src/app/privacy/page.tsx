import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: '隐私说明 - 童邻市集',
};

const PRIVACY_PARAGRAPHS = [
  '童邻市集重视用户个人信息与隐私安全，仅收集提供服务所必需的信息。',
  '我们可能收集的信息包括：手机号（用于注册/登录与账号识别）、所在小区（用于邻里就近展示）、孩子年龄段与孩子数量（选填，仅用于个性化推荐）、浏览、发布、私信、预约、反馈等使用记录（用于功能运行、安全审核、违规处理与服务改进）。',
  '我们不会向其他用户展示你的手机号，不会出售、出租或向无关第三方共享你的个人信息，也不会将你的个人信息用于无关商业营销。',
  '孩子相关信息仅用于个性化推荐，不会公开展示，也不会提供给其他用户或商家。',
  '平台仅会在以下场景使用相关信息：账号登录、邻里匹配、物品展示、私信沟通、预约流转、安全风控、投诉举报处理、违规审核与必要的运营维护。',
  '你可以在个人中心申请注销账号。账号注销后，我们将停止向该账号提供服务，并按照法律法规要求及平台安全、纠纷处理、审计留痕等必要目的处理相关信息。',
  '童邻市集仅提供信息展示、沟通与预约工具，不参与用户之间的交易。请勿在私信或线下交易中泄露详细住址、孩子姓名、学校班级、验证码等敏感信息。',
];

function getBackHref(from?: string) {
  if (from === 'login') return '/login';
  if (from === 'profile') return '/profile';
  return '/profile';
}

function getBackLabel(from?: string) {
  if (from === 'login') return '返回注册/登录';
  return '返回我的';
}

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const backHref = getBackHref(from);
  const backLabel = getBackLabel(from);

  return (
    <div className="min-h-screen">
      <div className="page-shell">
        <div className="mb-5 flex items-center gap-3">
          <Link href={backHref} aria-label={backLabel} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <ChevronLeft size={18} className="text-[#5d6b63]" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#1c2d24]">童邻市集 隐私说明</h1>
            <p className="mt-0.5 text-xs text-[#8c949c]">必要收集、清晰告知、严格保护</p>
          </div>
        </div>

        <article className="paper-surface rounded-[30px] px-5 py-6">
          <div className="mb-5 flex items-start gap-3 rounded-[24px] bg-[#eef6f0] px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#3d6b57]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-[#1f3a30]">隐私保护原则</p>
              <p className="mt-1 text-xs leading-5 text-[#61756a]">只为平台运行、邻里匹配、安全风控和必要服务改进使用。</p>
            </div>
          </div>

          <div className="space-y-4 text-sm leading-8 text-[#5f6d66]">
            {PRIVACY_PARAGRAPHS.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>

        {from === 'login' && (
          <div className="sticky bottom-[82px] z-[30] mt-4 pb-[env(safe-area-inset-bottom)]">
            <Link
              href="/login"
              className="primary-button flex w-full items-center justify-center rounded-full py-3.5 text-sm font-bold shadow-[0_18px_46px_rgba(70,64,54,0.18)]"
            >
              已阅读，返回注册/登录
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
