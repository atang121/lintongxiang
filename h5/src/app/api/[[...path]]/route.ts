import { NextRequest, NextResponse } from 'next/server';

// 根据环境选择后端 API 地址
const getBackendUrl = () => {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    return 'http://134.175.68.92:3001';
  }
  // 开发环境使用本地后端
  return 'http://localhost:3001';
};

const BACKEND_API_URL = getBackendUrl();

// 处理 CORS 预检请求
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PATCH');
}

async function handleRequest(
  request: NextRequest,
  params: { path?: string[] },
  method: string
): Promise<NextResponse> {
  try {
    // 解析路径参数
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    const path = pathSegments.join('/');

    // 构建后端 API URL
    const url = new URL(`/api/${path}`, BACKEND_API_URL);
    
    // 转发查询参数
    const searchParams = request.nextUrl.searchParams;
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    console.log(`[API Proxy] ${method} ${url.toString()}`);

    // 读取请求体（如果有）
    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = JSON.stringify(await request.json());
      } else if (contentType?.includes('multipart/form-data')) {
        // 对于 FormData，直接转发
        body = await request.formData();
      } else {
        body = await request.text();
      }
    }

    // 转发请求到后端
    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
        'Authorization': request.headers.get('authorization') || '',
      },
      body,
    });

    // 读取后端响应
    const responseData = await response.json();

    // 返回响应，添加 CORS 头
    const nextResponse = NextResponse.json(responseData, {
      status: response.status,
    });
    
    // 添加 CORS 头
    nextResponse.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return nextResponse;

  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return NextResponse.json(
      { error: '代理请求失败', details: String(error) },
      { status: 500 }
    );
  }
}
