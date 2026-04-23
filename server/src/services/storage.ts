import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const CosSdk = require('cos-nodejs-sdk-v5');

export type StorageProvider = 'local' | 'cos';

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigError';
  }
}

export type UploadImageInput = {
  dataUrl: string;
  fileName?: string;
  category?: string;
  ownerId?: string;
  requestOrigin?: string;
};

export type UploadImageResult = {
  provider: StorageProvider;
  key: string;
  url: string;
  mime_type: string;
  size: number;
};

type ParsedDataUrl = {
  mimeType: string;
  buffer: Buffer;
  extension: string;
};

const LOCAL_UPLOADS_DIR = path.resolve(__dirname, '../../data/uploads');
let cosClient: any = null;

function isCosRequested() {
  return process.env.STORAGE_PROVIDER === 'cos';
}

function hasCompleteCosConfig() {
  return Boolean(
    process.env.COS_SECRET_ID &&
      process.env.COS_SECRET_KEY &&
      process.env.COS_BUCKET &&
      process.env.COS_REGION
  );
}

function getCosClient() {
  if (!hasCompleteCosConfig()) return null;
  if (!cosClient) {
    cosClient = new CosSdk({
      SecretId: process.env.COS_SECRET_ID,
      SecretKey: process.env.COS_SECRET_KEY,
    });
  }
  return cosClient;
}

function getFileExtension(mimeType: string, fileName?: string) {
  const fromName = fileName?.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'jpg';
}

function parseDataUrl(dataUrl: string, fileName?: string): ParsedDataUrl {
  const match = String(dataUrl).match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    throw new Error('仅支持 base64 图片上传');
  }

  const mimeType = match[1];
  if (!mimeType.startsWith('image/')) {
    throw new Error('仅支持图片文件');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) {
    throw new Error('图片内容为空');
  }

  return {
    mimeType,
    buffer,
    extension: getFileExtension(mimeType, fileName),
  };
}

function getStorageProvider(): StorageProvider {
  if (isCosRequested() || hasCompleteCosConfig()) {
    return 'cos';
  }

  return 'local';
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function buildPublicBaseUrl(requestOrigin?: string) {
  if (process.env.STORAGE_PUBLIC_BASE_URL) {
    return trimTrailingSlash(process.env.STORAGE_PUBLIC_BASE_URL);
  }
  if (process.env.SERVER_PUBLIC_URL && !process.env.SERVER_PUBLIC_URL.includes('your-domain.com')) {
    return trimTrailingSlash(process.env.SERVER_PUBLIC_URL);
  }
  if (requestOrigin) {
    return trimTrailingSlash(requestOrigin);
  }
  return `http://127.0.0.1:${process.env.PORT || 3001}`;
}

async function uploadToCos(input: UploadImageInput, parsed: ParsedDataUrl, key: string): Promise<UploadImageResult> {
  const cos = getCosClient();
  if (!cos) {
    throw new StorageConfigError('腾讯云 COS 尚未完成配置');
  }

  await new Promise<void>((resolve, reject) => {
    cos.putObject(
      {
        Bucket: process.env.COS_BUCKET,
        Region: process.env.COS_REGION,
        Key: key,
        Body: parsed.buffer,
        ContentType: parsed.mimeType,
      },
      (error: Error | null) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });

  const publicBaseUrl =
    process.env.COS_PUBLIC_BASE_URL ||
    `https://${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com`;

  return {
    provider: 'cos',
    key,
    url: `${trimTrailingSlash(publicBaseUrl)}/${key}`,
    mime_type: parsed.mimeType,
    size: parsed.buffer.length,
  };
}

function uploadToLocal(input: UploadImageInput, parsed: ParsedDataUrl, key: string): UploadImageResult {
  const absolutePath = path.join(LOCAL_UPLOADS_DIR, key);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, parsed.buffer);

  return {
    provider: 'local',
    key,
    url: `${buildPublicBaseUrl(input.requestOrigin)}/uploads/${key}`,
    mime_type: parsed.mimeType,
    size: parsed.buffer.length,
  };
}

export async function uploadImage(input: UploadImageInput): Promise<UploadImageResult> {
  const parsed = parseDataUrl(input.dataUrl, input.fileName);
  const prefix = input.category || 'items';
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const random = crypto.randomUUID().slice(0, 12);
  const key = `${prefix}/${yyyy}/${mm}/${input.ownerId || 'guest'}-${random}.${parsed.extension}`;

  if (getStorageProvider() === 'cos') {
    if (!hasCompleteCosConfig()) {
      throw new StorageConfigError('腾讯云 COS 尚未完成配置，请补全 COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION');
    }
    return uploadToCos(input, parsed, key);
  }

  return uploadToLocal(input, parsed, key);
}

export function getLocalUploadsDir() {
  return LOCAL_UPLOADS_DIR;
}

export function getStorageProviderLabel() {
  return getStorageProvider();
}

export function isStorageReady() {
  if (getStorageProvider() === 'cos') {
    return hasCompleteCosConfig();
  }
  return true;
}

function shouldSignCosUrl(rawUrl: string) {
  if (!rawUrl || !hasCompleteCosConfig()) return false;
  try {
    const url = new URL(rawUrl);
    const bucket = process.env.COS_BUCKET;
    const region = process.env.COS_REGION;
    return (
      !!bucket &&
      !!region &&
      (
        url.hostname === `${bucket}.cos.${region}.myqcloud.com` ||
        url.hostname === `${bucket}.cos.${region}.tencentcos.cn`
      )
    );
  } catch {
    return false;
  }
}

function extractCosKey(rawUrl: string) {
  const url = new URL(rawUrl);
  return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
}

export function resolveAssetUrl(rawUrl: string) {
  if (!shouldSignCosUrl(rawUrl)) {
    return rawUrl;
  }

  const cos = getCosClient();
  if (!cos) return rawUrl;

  try {
    const result = cos.getObjectUrl({
      Bucket: process.env.COS_BUCKET,
      Region: process.env.COS_REGION,
      Key: extractCosKey(rawUrl),
      Sign: true,
      Expires: 60 * 60 * 24 * 7,
      Protocol: 'https:',
    });
    if (typeof result === 'string') return result;
    return result?.Url || rawUrl;
  } catch {
    return rawUrl;
  }
}

export function resolveAssetUrls(urls: string[]) {
  return urls.map((url) => resolveAssetUrl(url));
}
