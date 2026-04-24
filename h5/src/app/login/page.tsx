'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { CommunityPicker } from '@/components/CommunityPicker';
import { useToast } from '@/components/ui/Toast';

type AuthStage = 'verify' | 'profile';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-5xl animate-pulse">🌸</div></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const { setCurrentUser, selectedCommunity, communityOptions, opsSource } = useApp();
  const { show: toast } = useToast();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<AuthStage>('verify');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [community, setCommunity] = useState(selectedCommunity || '');
  const [district, setDistrict] = useState('');
  const [isCustomCommunity, setIsCustomCommunity] = useState(false);
  const [phone, setPhone] = useState('');
  const [temporaryToken, setTemporaryToken] = useState('');
  const [issuedCode, setIssuedCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success' | 'info'>('info');

  const rawEmailInput = () =>
    (emailInputRef.current?.value ?? email).trim().replace(/＠/g, '@').replace(/\u3000/g, '');
  const isValidEmail = (addr: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(addr);

  const setStoredToken = (token: string) => {
    if (typeof window.localStorage?.setItem !== 'function') return;
    window.localStorage.setItem('token', token);
  };

  const showMessage = (nextMessage: string, tone: 'error' | 'success' | 'info' = 'info') => {
    setMessage(nextMessage);
    setMessageTone(tone);
  };

  // 验证码倒计时
  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = setInterval(() => {
      setCodeCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [codeCooldown]);

  const handleSendCode = async () => {
    const addr = rawEmailInput();
    if (emailInputRef.current && addr !== email.trim()) {
      setEmail(addr);
    }
    if (!addr) {
      showMessage('请先输入邮箱', 'error');
      toast('请先输入邮箱', 'error');
      return;
    }
    if (!isValidEmail(addr)) {
      showMessage('请输入有效的邮箱地址', 'error');
      toast('请输入有效的邮箱地址', 'error');
      return;
    }

    setSendingCode(true);
    toast('正在发送验证码…', 'info');
    try {
      const result = await api.auth.sendCode({ email: addr });
      setIssuedCode(result.data.preview_code || '');
      const okMsg =
        result.data.delivery?.provider === 'smtp'
          ? '验证码已发送到你的邮箱，请查收后继续登录'
          : '验证码已准备好，请继续输入 6 位验证码';
      showMessage(okMsg, 'success');
      toast(result.data.delivery?.provider === 'smtp' ? '验证码已发送，请查收邮箱' : '验证码已就绪', 'success');
      setCodeCooldown(60); // 发送成功后开始60秒倒计时
    } catch (error: any) {
      const errMsg = error.message || '验证码发送失败，请稍后再试';
      showMessage(errMsg, 'error');
      toast(errMsg, 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleContinue = async () => {
    const addr = rawEmailInput();
    if (addr !== email.trim()) setEmail(addr);
    if (!addr) {
      showMessage('请先输入邮箱', 'error');
      toast('请先输入邮箱', 'error');
      return;
    }
    if (!code.trim()) {
      showMessage('请输入 6 位验证码', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.auth.verifyCode({
        email: addr,
        code: code.trim(),
      });

      if (result.data.need_profile_completion) {
        setStage('profile');
        setTemporaryToken(result.data.temporary_token || '');
        setNickname(result.data.profile_draft?.nickname || '');
        showMessage('首次使用，请补全昵称和小区完成注册', 'info');
        return;
      }

      if (result.data.token && result.data.user) {
        setStoredToken(result.data.token);
        setCurrentUser(result.data.user);
        router.push('/');
      }
    } catch (error: any) {
      showMessage(error.message || '验证码校验失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSubmit = async () => {
    if (!nickname.trim() || !community.trim()) {
      showMessage('请填写昵称并选择小区', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.auth.setupProfile({
        temporary_token: temporaryToken,
        nickname: nickname.trim(),
        community: community.trim(),
        district: district.trim(),
        phone: phone.trim(),
        isCustomCommunity,
      });
      setStoredToken(result.data.token);
      setCurrentUser(result.data.user);
      router.push('/?welcome=1');
    } catch (error: any) {
      showMessage(error.message || '资料补全失败，请稍后再试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="page-shell !max-w-[1120px]">
      <div className="mx-auto max-w-md px-0 pb-10 pt-4 lg:max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="secondary-button rounded-2xl p-2 shadow-sm">
            <ChevronLeft size={22} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="whitespace-nowrap text-base font-bold text-[#4b5862]">登录 / 注册</h1>
            <p className="text-xs text-[#8a97a1]">邮箱验证码，新用户自动引导注册</p>
          </div>
        </div>

        <div className="milk-panel overflow-hidden rounded-[32px] px-5 pb-6 pt-7 text-[#45515c] shadow-sm">
          <p className="story-kicker text-xs tracking-[0.22em] text-[#96a09a]">EMAIL CODE ACCESS</p>
          <h2 className="story-title mt-3 text-3xl leading-tight">邮箱验证码登录</h2>
          <p className="mt-3 text-sm leading-6 text-[#7d8892]">
            输入邮箱并获取验证码。首次使用将引导你完成注册，之后可直接登录。
          </p>
        </div>

        <div className="paper-surface mt-5 rounded-[32px] p-5 shadow-sm">
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
              <label className="mb-1.5 block text-xs font-semibold text-[#6f7f76]">邮箱</label>
              <input
                ref={emailInputRef}
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setEmail((emailInputRef.current?.value ?? email).trim())}
                placeholder="输入你的邮箱地址"
                className="soft-input min-h-[48px] w-full rounded-2xl px-4 py-3 text-base sm:min-h-0 sm:text-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#6f7f76]">邮箱验证码</label>
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
              disabled={sendingCode || submitting || codeCooldown > 0}
              className="order-2 flex min-h-[48px] w-full cursor-pointer select-none items-center justify-center rounded-2xl border border-[#8eb89e] bg-[linear-gradient(180deg,#e8f4ec,#d2e6da)] px-4 text-sm font-bold text-[#2d5a42] shadow-[0_6px_16px_rgba(61,107,87,0.18),inset_0_1px_0_rgba(255,255,255,0.75)] active:scale-[0.97] active:brightness-[0.96] disabled:cursor-not-allowed disabled:opacity-55 sm:order-2 sm:w-auto sm:min-w-[9.5rem] sm:px-5 relative z-10"
            >
              {sendingCode ? '发送中…' : codeCooldown > 0 ? `${codeCooldown}秒后可重发` : '获取验证码'}
            </button>
              </div>
              {issuedCode && (
                <div className="mt-2 rounded-2xl border border-[#ecd59b] bg-[#fff7df] px-4 py-3 text-sm text-[#7d5b2d]">
                  <div className="font-semibold">本机验证码</div>
                  <div className="mt-1 leading-6">
                    当前环境可直接使用这组验证码继续使用：
                    <span className="ml-1 font-bold tracking-[0.24em]">{issuedCode}</span>
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
                  <label className="mb-2 block text-xs font-semibold text-[#6f7f76]">所在小区</label>
                  <div className="rounded-2xl border border-[rgba(201,189,171,0.42)] bg-[#f8f5f0] p-3">
                    <CommunityPicker
                      value={community}
                      districtValue={district}
                      onChange={({ community: nextCommunity, district: nextDistrict, isCustom }) => {
                        setCommunity(nextCommunity);
                        setDistrict(nextDistrict);
                        setIsCustomCommunity(isCustom);
                      }}
                      communityOptions={communityOptions}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#8b949e]">
                    先选区县，再选小区；只有该区县暂无预设小区时，才允许手动补充。
                  </p>
                  {district && <p className="mt-1 text-xs text-[#8a7d68]">已选择区县：{district}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#6f7f76]">手机号（选填）</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="方便邻里联系你"
                    className="soft-input w-full rounded-2xl px-4 py-3 text-sm"
                  />
                </div>
              </>
            )}

            <button
              type="button"
              onClick={stage === 'verify' ? handleContinue : handleProfileSubmit}
              onPointerDown={() => {}}
              disabled={submitting || sendingCode}
              className="primary-button min-h-[48px] w-full rounded-2xl py-3.5 text-base font-bold active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 relative z-10"
            >
              {submitting
                ? (stage === 'verify' ? '登录中…' : '提交中…')
                : stage === 'verify' ? '登录' : '完成注册'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
