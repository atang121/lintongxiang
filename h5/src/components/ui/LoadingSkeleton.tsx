'use client';

/**
 * 加载骨架屏
 * 物品列表的加载占位，给用户"正在加载"的视觉反馈
 */
export default function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-3 pb-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
          {/* 图片 */}
          <div className="aspect-square bg-gray-200" />
          {/* 文字 */}
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
            <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
            <div className="flex items-center justify-between mt-2">
              <div className="h-3 bg-gray-100 rounded-full w-16" />
              <div className="h-3 bg-gray-100 rounded-full w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
