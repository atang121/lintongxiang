'use client';

/**
 * Toast 提示（轻量反馈，不需要三方库）
 * 用法：Toast.show('发布成功！', 'success')
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const bgColor: Record<ToastType, string> = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-gray-800',
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Toast 容器 */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${bgColor[toast.type]} text-white text-sm px-5 py-3 rounded-full shadow-lg pointer-events-auto animate-fade-in`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
