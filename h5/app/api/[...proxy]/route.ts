import { NextRequest, NextResponse } from 'next/server';

const API_TARGET = 'http://134.175.68.92:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  const path = params.proxy.join('/');
  const targetUrl = `${API_TARGET}/api/${path}${request.nextUrl.search}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        ...Object.fromEntries(
          request.headers.entries().filter(([key]) => 
            !['host', 'connection'].includes(key.toLowerCase())
          )
        ),
      },
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Backend error' }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  const path = params.proxy.join('/');
  const targetUrl = `${API_TARGET}/api/${path}${request.nextUrl.search}`;
  
  try {
    const body = await request.text();
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        ...Object.fromEntries(
          request.headers.entries().filter(([key]) => 
            !['host', 'connection'].includes(key.toLowerCase())
          )
        ),
      },
      body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Backend error' }, { status: 502 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  const path = params.proxy.join('/');
  const targetUrl = `${API_TARGET}/api/${path}${request.nextUrl.search}`;
  
  try {
    const body = await request.text();
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        ...Object.fromEntries(
          request.headers.entries().filter(([key]) => 
            !['host', 'connection'].includes(key.toLowerCase())
          )
        ),
      },
      body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Backend error' }, { status: 502 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  const path = params.proxy.join('/');
  const targetUrl = `${API_TARGET}/api/${path}${request.nextUrl.search}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        ...Object.fromEntries(
          request.headers.entries().filter(([key]) => 
            !['host', 'connection'].includes(key.toLowerCase())
          )
        ),
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Backend error' }, { status: 502 });
  }
}
