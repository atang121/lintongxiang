import { Suspense } from 'react';
import { PublishClient } from './PublishClient';

export const dynamic = 'force-dynamic';

export default function PublishPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f6f0e5] flex items-center justify-center">
        <div className="text-[#66756d]">加载中...</div>
      </div>
    }>
      <PublishClient />
    </Suspense>
  );
}
