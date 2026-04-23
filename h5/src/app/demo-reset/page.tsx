'use client';

import { useState } from 'react';
import Link from 'next/link';

import { resetDemoData } from '@/lib/admin';

export default function DemoResetPage() {
  const [token, setToken] = useState('local-demo-reset');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('重置后会恢复演示数据，并清空当前本地登录状态。');

  const handleReset = async () => {
    setStatus('loading');
    try {
      await resetDemoData(token.trim() || 'local-demo-reset');
      if (typeof window.localStorage?.removeItem === 'function') {
        window.localStorage.removeItem('user');
        window.localStorage.removeItem('token');
      }
      setStatus('done');
      setMessage('演示数据已恢复。你可以重新登录，用新的默认样本继续体验。');
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.message || '重置失败，请检查管理员口令。');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <div className="text-4xl mb-4">🛠️</div>
        <h1 className="text-xl font-bold text-gray-900">演示数据重置</h1>
        <p className="text-sm text-gray-500 mt-2 leading-6">
          这是隐藏的演示维护入口，仅用于把平台恢复到“已经在正常运营”的初始样本状态。
        </p>

        <div className="mt-5">
          <label className="block text-xs font-semibold text-gray-500 mb-2">管理员口令</label>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="请输入演示重置口令"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
          status === 'error'
            ? 'bg-red-50 text-red-600'
            : status === 'done'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-gray-50 text-gray-600'
        }`}>
          {message}
        </div>

        <button
          onClick={() => void handleReset()}
          disabled={status === 'loading'}
          className="w-full mt-5 rounded-2xl bg-blue-600 text-white py-3 font-bold disabled:opacity-60"
        >
          {status === 'loading' ? '重置中...' : '恢复演示数据'}
        </button>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-blue-600">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
