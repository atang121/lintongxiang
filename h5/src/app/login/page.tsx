'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { CommunityPicker } from '@/components/CommunityPicker';
import { ServiceDocument, ServiceDocumentKey, serviceDocumentOrder, serviceDocuments } from '@/data/serviceAgreement';

type AuthStage = 'verify' | 'profile';
type AgreementMode = 'registration' | 'reaccept';

const CHILD_AGE_OPTIONS = [
  { value: '0-3', label: '0-3岁' },
  { value: '3-6', label: '3-6岁' },
  { value: '6-12', label: '6-12岁' },
  { value: '12-18', label: '12-18岁' },
];

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-5xl animate-pulse">🌸</div></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const { setCurrentUser, communityOptions } = useApp();
  const { show: toast } = useToast();

  const [stage, setStage] = useState<AuthStage>('verify');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [community, setCommunity] = useState('');
  const [district, setDistrict] = useState('');
  const [childAgeRanges, setChildAgeRanges] = useState<string[]>([]);
  const [childCount, setChildCount] = useState<number>(0);
  const [temporaryToken, setTemporaryToken] = useState('');
  const [previewCode, setPreviewCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success' | 'info'>('info');
  const [submitError, setSubmitError] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementError, setAgreementError] = useState('');
  const [agreementMode, setAgreementMode] = useState<AgreementMode>('registration');
  const [agreementDocuments, setAgreementDocuments] = useState(serviceDocuments);
  const [agreementOrder, setAgreementOrder] = useState(serviceDocumentOrder);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const agreementErrorRef = useRef<number | null>(null);
  const restoredDraftRef = useRef(false);
  const loginDraftKey = 'tonglin-login-draft';

  const isValidPhone = (p: string) => /^1[3-9]\d{9}$/.test(p);

  // 60秒倒计时
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  useEffect(() => {
    let ignore = false;
    api.legal.getServiceAgreement()
      .then((content: { order?: ServiceDocumentKey[]; documents?: Record<ServiceDocumentKey, ServiceDocument> } | null) => {
        if (ignore || !content?.documents || !Array.isArray(content.order)) return;
        const nextOrder = content.order.filter((key) => content.documents?.[key]);
        if (nextOrder.length === 0) return;
        setAgreementDocuments(content.documents);
        setAgreementOrder(nextOrder);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (restoredDraftRef.current) return;
    restoredDraftRef.current = true;
    if (typeof window.sessionStorage?.getItem !== 'function') return;

    try {
      const rawDraft = window.sessionStorage.getItem(loginDraftKey);
      if (!rawDraft) return;
      const draft = JSON.parse(rawDraft);
      if (draft.stage === 'verify' || draft.stage === 'profile') setStage(draft.stage);
      if (typeof draft.phone === 'string') setPhone(draft.phone);
      if (typeof draft.code === 'string') setCode(draft.code);
      if (typeof draft.nickname === 'string') setNickname(draft.nickname);
      if (typeof draft.community === 'string') setCommunity(draft.community);
      if (typeof draft.district === 'string') setDistrict(draft.district);
      if (Array.isArray(draft.childAgeRanges)) setChildAgeRanges(draft.childAgeRanges);
      if (typeof draft.childCount === 'number') setChildCount(draft.childCount);
      if (typeof draft.temporaryToken === 'string') setTemporaryToken(draft.temporaryToken);
      if (typeof draft.previewCode === 'string') setPreviewCode(draft.previewCode);
      if (typeof draft.agreementAccepted === 'boolean') setAgreementAccepted(draft.agreementAccepted);
      if (draft.agreementMode === 'registration' || draft.agreementMode === 'reaccept') setAgreementMode(draft.agreementMode);
    } catch {
      window.sessionStorage.removeItem(loginDraftKey);
    }
  }, []);

  useEffect(() => {
    if (!restoredDraftRef.current || typeof window.sessionStorage?.setItem !== 'function') return;
    const hasDraft = phone || code || nickname || community || temporaryToken || previewCode || agreementAccepted || agreementMode !== 'registration';
    if (!hasDraft) {
      window.sessionStorage.removeItem(loginDraftKey);
      return;
    }

    window.sessionStorage.setItem(
      loginDraftKey,
      JSON.stringify({
        stage,
        phone,
        code,
        nickname,
        community,
        district,
        childAgeRanges,
        childCount,
        temporaryToken,
        previewCode,
        agreementAccepted,
        agreementMode,
      })
    );
  }, [stage, phone, code, nickname, community, district, childAgeRanges, childCount, temporaryToken, previewCode, agreementAccepted, agreementMode]);

  const setStoredToken = (token: string) => {
    if (typeof window.localStorage?.setItem !== 'function') return;
    window.localStorage.setItem('token', token);
  };

  const clearLoginDraft = () => {
    if (typeof window.sessionStorage?.removeItem !== 'function') return;
    window.sessionStorage.removeItem(loginDraftKey);
  };

  const showMsg = (nextMessage: string, tone: 'error' | 'success' | 'info' = 'info') => {
    setMessage(nextMessage);
    setMessageTone(tone);
  };

  const showSubmitError = (nextMessage: string) => {
    setSubmitError(nextMessage);
    showMsg(nextMessage, 'error');
    toast(nextMessage, 'error');
    window.setTimeout(() => setSubmitError(''), 3000);
  };

  const handleChildCountChange = (nextCount: number) => {
    setChildCount(nextCount);
    setChildAgeRanges((prev) => (nextCount > 0 ? prev.slice(0, nextCount) : []));
  };

  const updateChildAgeRange = (index: number, value: string) => {
    setChildAgeRanges((prev) => {
      const next = [...prev];
      next[index] = next[index] === value ? '' : value;
      return next.slice(0, Math.max(childCount, 0));
    });
  };

  const requireAgreementAccepted = (message = '请先阅读并勾选下方用户服务文件') => {
    if (agreementAccepted) return true;
    setAgreementError(message);
    if (agreementErrorRef.current) window.clearTimeout(agreementErrorRef.current);
    agreementErrorRef.current = window.setTimeout(() => setAgreementError(''), 3000);
    return false;
  };

  const handleSendCode = async () => {
    if (!phone.trim()) {
      showMsg('请先输入手机号', 'error');
      toast('请先输入手机号', 'error');
      return;
    }
    if (!isValidPhone(phone.trim())) {
      showMsg('请输入有效的手机号', 'error');
      toast('请输入有效的手机号', 'error');
      return;
    }
    if (cooldown > 0) return;

    setSendingCode(true);
    toast('正在发送验证码…', 'info');
    try {
      const result = await api.auth.sendCode({ phone: phone.trim() });
      setPreviewCode(result.data.preview_code || '');
      setCooldown(result.data.cooldown_seconds || 60);
      const okMsg = result.data.preview_code
        ? '验证码已生成，请继续输入'
        : '验证码已发送，请查收';
      showMsg(okMsg, 'success');
      toast(okMsg, 'success');
    } catch (error: any) {
      const errMsg = error.message || '验证码发送失败，请稍后再试';
      showMsg(errMsg, 'error');
      toast(errMsg, 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleContinue = async () => {
    if (!phone.trim()) {
      showSubmitError('请先输入手机号');
      return;
    }
    if (!code.trim()) {
      showSubmitError('请输入 6 位验证码');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.auth.verifyCode({
        phone: phone.trim(),
        code: code.trim(),
        service_agreement_accepted: agreementAccepted,
        service_agreement_source: 'login',
      });

      if (result.data.need_profile_completion) {
        setStage('profile');
        setTemporaryToken(result.data.temporary_token || '');
        setNickname(result.data.profile_draft?.nickname || '');
        setCommunity('');
        setDistrict('');
        setAgreementMode('registration');
        setAgreementAccepted(false);
        showMsg('首次使用，请补全昵称和所在小区完成注册', 'info');
        return;
      }

      if (result.data.token && result.data.user) {
        setStoredToken(result.data.token);
        setCurrentUser(result.data.user);
        clearLoginDraft();
        router.push('/');
      }
    } catch (error: any) {
      if (error?.code === 'SERVICE_AGREEMENT_REQUIRED' || error?.status === 428) {
        setAgreementMode('reaccept');
        setAgreementError('协议已更新，请阅读并勾选后继续登录');
        toast('协议已更新，请先确认最新版本', 'info');
        if (agreementErrorRef.current) window.clearTimeout(agreementErrorRef.current);
        agreementErrorRef.current = window.setTimeout(() => setAgreementError(''), 3000);
        return;
      }
      showSubmitError(error.message || '验证码校验失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSubmit = async () => {
    if (!nickname.trim()) {
      showSubmitError('请填写昵称');
      return;
    }
    if (!community.trim()) {
      showSubmitError('请选择或填写你所在的小区');
      return;
    }
    if (!requireAgreementAccepted('请先阅读并勾选《用户服务协议》全部条款')) return;

    setSubmitting(true);
    try {
      const result = await api.auth.setupProfile({
        temporary_token: temporaryToken,
        nickname: nickname.trim(),
        community: community.trim(),
        district: district.trim(),
        child_age_ranges: childAgeRanges.filter(Boolean),
        child_count: childCount,
        service_agreement_accepted: true,
        service_agreement_source: 'registration',
      });
      setStoredToken(result.data.token);
      setCurrentUser(result.data.user);
      clearLoginDraft();
      router.push('/?welcome=1');
    } catch (error: any) {
      showSubmitError(error.message || '资料补全失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="page-shell !max-w-[1120px]">
      <div className="mx-auto max-w-md px-0 pb-10 pt-4">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/" className="secondary-button rounded-2xl p-2 shadow-sm">
            <ChevronLeft size={22} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="whitespace-nowrap text-base font-bold text-[#4b5862]">注册/登录</h1>
            <p className="text-xs text-[#8a97a1]">手机号验证码，快速注册/登录</p>
          </div>
        </div>

        <div className="paper-surface rounded-[30px] p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-[24px] font-black leading-tight text-[#45515c]">手机号注册/登录</h2>
            <p className="mt-2 text-sm leading-6 text-[#7d8892]">
              输入手机号获取验证码，新用户只需再补昵称和所在小区。
            </p>
          </div>

          {message && (
            <div className={`mb-4 rounded-2xl px-4 py-3 text-sm ${
              messageTone === 'error'
                ? 'bg-red-50 text-red-600'
                : messageTone === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#6f7f76]">手机号</label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="输入你的手机号"
                className="soft-input min-h-[48px] w-full rounded-2xl px-4 py-3 text-base sm:min-h-0 sm:text-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#6f7f76]">验证码</label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="输入 6 位验证码"
                  className="soft-input order-1 min-h-[48px] w-full rounded-2xl px-4 py-3 text-base sm:min-h-0 sm:flex-1 sm:min-w-0 sm:text-sm"
                />
            <button
              type="button"
              onClick={() => void handleSendCode()}
              onPointerDown={() => {}}
              disabled={sendingCode || submitting || cooldown > 0}
              className="order-2 flex min-h-[48px] w-full cursor-pointer select-none items-center justify-center rounded-2xl border border-[#8eb89e] bg-[linear-gradient(180deg,#e8f4ec,#d2e6da)] px-4 text-sm font-bold text-[#2d5a42] shadow-[0_6px_16px_rgba(61,107,87,0.18),inset_0_1px_0_rgba(255,255,255,0.75)] active:scale-[0.97] active:brightness-[0.96] disabled:cursor-not-allowed disabled:opacity-55 sm:order-2 sm:w-auto sm:min-w-[9.5rem] sm:px-5 relative z-10"
            >
              {sendingCode ? '发送中…' : cooldown > 0 ? `${cooldown}s 后重发` : '获取验证码'}
            </button>
              </div>
              {previewCode && (
                <div className="mt-2 rounded-2xl border border-[#ecd59b] bg-[#fff7df] px-4 py-3 text-sm text-[#7d5b2d]">
                  <div className="font-semibold">📱 开发模式验证码</div>
                  <div className="mt-1 leading-6">
                    当前环境可直接使用这组验证码继续：
                    <span className="ml-1 font-bold tracking-[0.24em]">{previewCode}</span>
                  </div>
                </div>
              )}
            </div>

            {stage === 'profile' && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#6f7f76]">昵称</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="起个好记的昵称，如：涵妈、小宝爸"
                    className="soft-input w-full rounded-2xl px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#6f7f76]">📍 所在小区 <span className="text-red-500">*</span></label>
                  <CommunityPicker
                    value={community}
                    districtValue={district}
                    onChange={({ community: nextCommunity, district: nextDistrict }) => {
                      setCommunity(nextCommunity);
                      setDistrict(nextDistrict);
                    }}
                    communityOptions={communityOptions}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#6f7f76]">👨‍👩‍👧‍👦 孩子数量 <span className="font-normal text-[#9a9288]">（选填，可跳过）</span></label>
                  <p className="mb-2 text-xs leading-5 text-[#8c949c]">
                    选好数量后，可填写每个孩子的年龄段，帮你更快找到合适的闲置。
                  </p>
                  <div className="flex gap-2">
                    {[
                      { value: 0, label: '暂不填' },
                      { value: 1, label: '1个' },
                      { value: 2, label: '2个' },
                      { value: 3, label: '3个+' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleChildCountChange(opt.value)}
                        onPointerDown={() => {}}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                          childCount === opt.value
                            ? 'bg-[#9cbba8] text-white shadow-sm'
                            : 'border border-[rgba(201,189,171,0.42)] bg-white/70 text-[#7f8890]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {childCount > 0 && (
                  <div className="space-y-3">
                    {Array.from({ length: childCount }).map((_, index) => (
                      <div key={index} className="rounded-2xl border border-[rgba(201,189,171,0.42)] bg-white/64 px-4 py-3">
                        <label className="mb-2 block text-xs font-semibold text-[#6f7f76]">
                          👶 {childCount === 1 ? '孩子年龄段' : `孩子${index + 1} 年龄段`} <span className="font-normal text-[#9a9288]">（选填）</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CHILD_AGE_OPTIONS.map((opt) => {
                            const selected = childAgeRanges[index] === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateChildAgeRange(index, opt.value)}
                                onPointerDown={() => {}}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                                  selected
                                    ? 'bg-[#9cbba8] text-white shadow-sm'
                                    : 'border border-[rgba(201,189,171,0.42)] bg-white/70 text-[#7f8890]'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] leading-5 text-[#9a9288]">信息仅用于个性化推荐，不会公开</p>
                      </div>
                    ))}
                    {childCount === 3 && (
                      <p className="px-1 text-[11px] leading-5 text-[#9a9288]">如需填写更多孩子信息，可后续在个人中心补充。</p>
                    )}
                  </div>
                )}

                <p className="rounded-2xl bg-[#f7f2ea] px-4 py-3 text-xs leading-5 text-[#8a7d68]">
                  这些信息仅用于个性化推荐，绝不会公开展示，也不会用于其他用途，请放心填写。
                </p>
              </>
            )}

            {(stage === 'profile' || agreementMode === 'reaccept') && (
              <AgreementConfirm
                checked={agreementAccepted}
                error={agreementError}
                documents={agreementDocuments}
                order={agreementOrder}
                mode={agreementMode}
                onChange={(nextChecked) => {
                  setAgreementAccepted(nextChecked);
                  if (nextChecked) setAgreementError('');
                }}
              />
            )}

            {submitError && (
              <div className="rounded-2xl border border-[#f0c5bd] bg-[#fff4f1] px-4 py-2 text-center text-xs font-semibold text-[#b85342]">
                {submitError}
              </div>
            )}

            <button
              type="button"
              onClick={stage === 'verify' ? handleContinue : handleProfileSubmit}
              onPointerDown={() => {}}
              disabled={submitting || sendingCode}
              className="primary-button min-h-[48px] w-full rounded-2xl py-3.5 text-base font-bold active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 relative z-10"
            >
              {submitting
                ? (stage === 'verify' ? '注册/登录中…' : '注册并登录中…')
                : stage === 'verify' ? '注册/登录' : '完成注册并登录'}
            </button>

            <p className="border-t border-[rgba(201,189,171,0.32)] pt-4 text-xs leading-6 text-[#8c949c]">
              童邻市集仅提供邻里信息展示、沟通与预约工具；不参与交易、不提供担保，物品验收、付款、交付及售后由双方自行确认并承担相应风险。
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function AgreementConfirm({
  checked,
  error,
  documents,
  order,
  mode,
  onChange,
}: {
  checked: boolean;
  error: string;
  documents: Record<ServiceDocumentKey, ServiceDocument>;
  order: ServiceDocumentKey[];
  mode: AgreementMode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#eadfca] bg-[#fffaf1] px-4 py-3">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          aria-label={checked ? '取消同意用户服务文件' : '同意用户服务文件'}
          onClick={() => onChange(!checked)}
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[11px] font-black ${
            checked ? 'border-[#2f6247] bg-[#2f6247] text-white' : 'border-[#b9c3ba] bg-white text-transparent'
          }`}
        >
          ✓
        </button>
        <span className="text-xs leading-5 text-[#667268]">
          {mode === 'reaccept' ? '协议已更新，我已仔细阅读并同意' : '我已仔细阅读并同意'}
          <Link
            href={`/terms/${order[0] || 'user-service-agreement'}?from=login`}
            className="mx-0.5 font-semibold text-[#2f6247] underline decoration-[#9fbea8] underline-offset-2"
          >
            《{documents[order[0]]?.title || '用户服务协议'}》
          </Link>
          全部条款，并知悉
          <Link
            href="/privacy?from=login"
            className="mx-0.5 font-semibold text-[#2f6247] underline decoration-[#9fbea8] underline-offset-2"
          >
            《隐私说明》
          </Link>
        </span>
      </div>
      {error && (
        <p className="mt-2 rounded-xl bg-[#fff1ec] px-3 py-2 text-xs font-semibold text-[#b85342]">
          {error}
        </p>
      )}
    </div>
  );
}
