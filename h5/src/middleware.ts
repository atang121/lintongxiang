import { NextRequest, NextResponse } from 'next/server';

const API_TARGET = 'http://134.175.68.92:3001';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // 代理到后端服务器
  url.protocol = 'http:';
  url.host = '134.175.68.92:3001';
  url.port = '3001';

  // 使用 rewrite 方式（Edge Runtime 兼容）
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-forwarded-host', request.headers.get('host') || '');
  requestHeaders.set('x-real-ip', request.headers.get('x-real-ip') || '');

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/api/:path*',
};
