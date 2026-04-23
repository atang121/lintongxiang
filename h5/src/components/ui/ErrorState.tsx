'use client';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = '加载失败，请检查网络后重试', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">😟</div>
      <h3 className="mb-2 text-base font-semibold text-[#415449]">出错了</h3>
      <p className="mb-6 max-w-xs text-sm text-[#8c7d63]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-full bg-[#1f3a30] px-6 py-2.5 text-sm font-medium text-white transition-colors active:bg-[#173026]"
        >
          重新加载
        </button>
      )}
    </div>
  );
}
