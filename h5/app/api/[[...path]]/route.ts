import { NextRequest, NextResponse } from 'next/server';

const API_TARGET = 'http://134.175.68.92:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathStr = path?.join('/') || '';
  const targetUrl = `${API_TARGET}/api/${pathStr}${request.nextUrl.search}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: getFilteredHeaders(request.headers),
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Backend error', details: String(error) }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathStr = path?.join('/') || '';
  const targetUrl = `${API_TARGET}/api/${pathStr}${request.nextUrl.search}`;
  
  try {
    const body = await request.text();
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: getFilteredHeaders(request.headers),
      body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Backend error', details: String(error) }, { status: 502 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathStr = path?.join('/') || '';
  const targetUrl = `${API_TARGET}/api/${pathStr}${request.nextUrl.search}`;
  
  try {
    const body = await request.text();
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: getFilteredHeaders(request.headers),
      body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Backend error', details: String(error) }, { status: 502 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathStr = path?.join('/') || '';
  const targetUrl = `${API_TARGET}/api/${pathStr}${request.nextUrl.search}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: getFilteredHeaders(request.headers),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Backend error', details: String(error) }, { status: 502 });
  }
}

function getFilteredHeaders(headers: Headers): Record<string, string> {
  const filtered: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
      filtered[key] = value;
    }
  });
  return filtered;
}
