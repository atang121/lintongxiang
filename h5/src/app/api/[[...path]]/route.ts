import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://134.175.68.92:3001';

// 需要转发到后端的请求头（包含认证信息）
const FORWARD_HEADERS = ['authorization', 'cookie', 'x-demo-admin-token', 'x-user-id'];

function forwardHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    if (FORWARD_HEADERS.includes(key.toLowerCase())) {
      result[key] = value;
    }
  }
  return result;
}

async function proxyRequest(
  request: Request,
  pathStr: string,
  method: string
) {
  const url = new URL(request.url);
  const query = url.search;
  const headers = forwardHeaders(request.headers);
  
  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.text();
  }

  try {
    const res = await fetch(`${API_BASE}/api/${pathStr}${query}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'backend error' }, { status: 502 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathStr = (path || []).join('/');
  return proxyRequest(request, pathStr, 'GET');
}

export async function POST(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const pathStr = (path || []).join('/');
  return proxyRequest(request, pathStr, 'POST');
}

export async function PUT(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const pathStr = (path || []).join('/');
  return proxyRequest(request, pathStr, 'PUT');
}

export async function DELETE(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const pathStr = (path || []).join('/');
  return proxyRequest(request, pathStr, 'DELETE');
}

export async function PATCH(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const pathStr = (path || []).join('/');
  return proxyRequest(request, pathStr, 'PATCH');
}
