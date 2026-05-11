const SQL_DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const ISO_WITHOUT_ZONE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

export function normalizeBackendTime(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return new Date().toISOString();
  const raw = value.trim();

  if (SQL_DATETIME_RE.test(raw)) {
    return `${raw.replace(' ', 'T')}Z`;
  }
  if (ISO_WITHOUT_ZONE_RE.test(raw)) {
    return `${raw}Z`;
  }
  return raw;
}

export function toTimeMs(value: unknown): number {
  const time = new Date(normalizeBackendTime(value)).getTime();
  return Number.isFinite(time) ? time : Date.now();
}

export function formatRelativeTime(value: unknown): string {
  const diff = Math.max(0, (Date.now() - toTimeMs(value)) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时`;
  return `${Math.floor(diff / 86400)}天`;
}
