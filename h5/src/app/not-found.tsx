/**
 * 404 页面
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <div className="text-7xl mb-4">🏚️</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">页面不存在</h1>
      <p className="text-gray-400 text-sm mb-8">
        可能是链接已过期，或者你走错地方了
      </p>
      <div className="space-y-3">
        <Link
          href="/"
          className="block w-full bg-blue-500 text-white py-3 rounded-full text-sm font-medium text-center"
        >
          返回首页
        </Link>
        <Link
          href="/publish"
          className="block w-full bg-white border border-gray-200 text-gray-600 py-3 rounded-full text-sm font-medium text-center"
        >
          发布闲置
        </Link>
      </div>
    </div>
  );
}
