import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://134.175.68.92:3001';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathStr = (path || []).join('/');
  const url = new URL(request.url);
  const query = url.search;
  try {
    const res = await fetch(`${API_BASE}/api/${pathStr}${query}`, {
      headers: { ...Object.fromEntries(Object.entries(request.headers).filter(([key]) => key.startsWith('x-') || key === 'cookie')) },
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch { return NextResponse.json({ error: 'backend error' }, { status: 502 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const pathStr = (path || []).join('/');
  const body = await request.text();
  try {
    const res = await fetch(`${API_BASE}/api/${pathStr}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(Object.entries(request.headers).filter(([key]) => key.startsWith('x-') || key === 'cookie'))
      },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch { return NextResponse.json({ error: 'backend error' }, { status: 502 }); }
}
