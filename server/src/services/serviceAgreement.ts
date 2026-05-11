import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

import { getOne, run, uuid } from '../models/db';
import fallbackConfig from '../config/serviceAgreement.json';

type ServiceAgreementDocument = {
  title: string;
  summary: string;
  paragraphs: string[];
};

export type ServiceAgreementContent = {
  version: string;
  order: string[];
  documents: Record<string, ServiceAgreementDocument>;
};

const AGREEMENT_KEY = 'user-service-agreement';
const FALLBACK_TITLE = '用户服务协议';
const FALLBACK_SUMMARY = '童邻市集用户服务协议，覆盖账号注册、平台定位、发布规则、交易安全与免责声明。';

function fallbackAgreementPath() {
  return path.resolve(__dirname, '../../../h5/public/legal/service-agreement.json');
}

function normalizeParagraphs(text: string) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function decodeXmlText(text: string) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractZipEntry(buffer: Buffer, entryName: string) {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('无法读取 docx 文件结构');

  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let offset = centralDirOffset;

  for (let entry = 0; entry < totalEntries; entry++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.slice(offset + 46, offset + 46 + fileNameLength).toString('utf8');

    if (name === entryName) {
      if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
        throw new Error('docx 文件头异常');
      }
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.slice(dataStart, dataStart + compressedSize);
      if (compressionMethod === 0) return compressed;
      if (compressionMethod === 8) return zlib.inflateRawSync(compressed);
      throw new Error('暂不支持该 docx 压缩格式');
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error('未找到 Word 正文内容');
}

function extractTextFromDocx(buffer: Buffer) {
  const xml = extractZipEntry(buffer, 'word/document.xml').toString('utf8');
  const paragraphs = xml
    .split(/<\/w:p>/)
    .map((paragraphXml) => {
      const parts = [...paragraphXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map((match) => decodeXmlText(match[1]))
        .join('');
      return parts.trim();
    })
    .filter(Boolean);
  return paragraphs.join('\n');
}

export function extractAgreementTextFromUpload(input: { fileName: string; dataUrl: string }) {
  const match = String(input.dataUrl || '').match(/^data:.*?;base64,(.+)$/);
  if (!match) throw new Error('文件数据格式不正确');

  const fileName = String(input.fileName || '').toLowerCase();
  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length > 2 * 1024 * 1024) throw new Error('协议文件不能超过 2MB');

  if (fileName.endsWith('.docx')) {
    const text = extractTextFromDocx(buffer);
    if (!text.trim()) throw new Error('未能从 Word 文档中读取到正文');
    return text;
  }

  if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    return buffer.toString('utf8');
  }

  throw new Error('请上传 .docx、.txt 或 .md 文件，旧版 .doc 建议另存为 .docx 后再上传');
}

function coerceContent(raw: any): ServiceAgreementContent | null {
  if (!raw?.version || !raw?.documents || !Array.isArray(raw.order)) return null;
  const documents = raw.documents as Record<string, ServiceAgreementDocument>;
  const order = raw.order.filter((key: string) => Boolean(documents[key]));
  if (order.length === 0) return null;

  return {
    version: String(raw.version),
    order,
    documents,
  };
}

export function buildServiceAgreementContent(input: {
  version: string;
  title?: string;
  summary?: string;
  text: string;
}): ServiceAgreementContent {
  const version = String(input.version || '').trim();
  if (!version) throw new Error('协议版本号不能为空');

  const paragraphs = normalizeParagraphs(input.text);
  if (paragraphs.length === 0) throw new Error('协议正文不能为空');

  return {
    version: version.slice(0, 32),
    order: [AGREEMENT_KEY],
    documents: {
      [AGREEMENT_KEY]: {
        title: String(input.title || FALLBACK_TITLE).trim().slice(0, 40) || FALLBACK_TITLE,
        summary: String(input.summary || FALLBACK_SUMMARY).trim().slice(0, 120) || FALLBACK_SUMMARY,
        paragraphs,
      },
    },
  };
}

export function getLatestServiceAgreement(): ServiceAgreementContent {
  const row = getOne(
    'SELECT content_json FROM service_agreements ORDER BY datetime(published_at) DESC, created_at DESC LIMIT 1'
  ) as Record<string, any> | null;

  if (row?.content_json) {
    try {
      const parsed = coerceContent(JSON.parse(String(row.content_json)));
      if (parsed) return parsed;
    } catch {}
  }

  try {
    const raw = fs.readFileSync(fallbackAgreementPath(), 'utf8');
    const parsed = coerceContent(JSON.parse(raw));
    if (parsed) return parsed;
  } catch {}

  return {
    version: String((fallbackConfig as any).version || '2026-05-04'),
    order: [AGREEMENT_KEY],
    documents: {
      [AGREEMENT_KEY]: {
        title: FALLBACK_TITLE,
        summary: FALLBACK_SUMMARY,
        paragraphs: ['童邻市集仅提供邻里信息展示、沟通与预约工具；不参与交易、不提供担保。'],
      },
    },
  };
}

export function publishServiceAgreement(input: {
  version: string;
  title?: string;
  summary?: string;
  text: string;
  note?: string;
  source?: string;
  publishedBy?: string;
}) {
  const content = buildServiceAgreementContent(input);
  const id = `sa_${uuid().slice(0, 8)}`;
  run(
    `INSERT INTO service_agreements
       (id, version, title, content_json, source, note, published_by, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(version) DO UPDATE SET
       title = excluded.title,
       content_json = excluded.content_json,
       source = excluded.source,
       note = excluded.note,
       published_by = excluded.published_by,
       published_at = excluded.published_at`,
    [
      id,
      content.version,
      content.documents[AGREEMENT_KEY].title,
      JSON.stringify(content),
      String(input.source || 'admin').slice(0, 32),
      String(input.note || '').slice(0, 120),
      String(input.publishedBy || '').slice(0, 64),
    ]
  );

  return content;
}

export function getLatestServiceAgreementRecord() {
  const content = getLatestServiceAgreement();
  const row = getOne(
    'SELECT version, note, source, published_by, published_at FROM service_agreements WHERE version = ? LIMIT 1',
    [content.version]
  ) as Record<string, any> | null;

  return {
    ...content,
    note: row?.note || '',
    source: row?.source || 'file',
    published_by: row?.published_by || '',
    published_at: row?.published_at || '',
  };
}
