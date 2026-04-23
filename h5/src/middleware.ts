import { NextRequest, NextResponse } from 'next/server';

const API_TARGET = process.env.API_TARGET || 'http://134.175.68.92:3001';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.protocol = API_TARGET.startsWith('https') ? 'https:' : 'http:';
  url.host = API_TARGET.replace(/^https?:\/\//, '');
  url.port = '';

  const response = await fetch(url.toString(), {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers.entries()),
      'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
      'X-Real-IP': request.headers.get('x-real-ip') || '',
    },
    body: request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.clone().text()
      : undefined,
    // @ts-ignore
    duplex: 'half',
  });

  const body = await response.text();
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    // 不转发某些 headers
    if (!['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  return new NextResponse(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const config = {
  matcher: '/api/:path*',
};
