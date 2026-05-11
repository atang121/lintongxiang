const FALLBACK_ADMIN_PHONES = ['15271090260'];

function parsePhones(value?: string) {
  return String(value || '')
    .split(',')
    .map((phone) => phone.trim())
    .filter(Boolean);
}

export function getConfiguredAdminPhones() {
  const phones = parsePhones(process.env.ADMIN_PHONES || process.env.ADMIN_PHONE);
  return phones.length > 0 ? phones : FALLBACK_ADMIN_PHONES;
}

export function isConfiguredAdminPhone(phone: string) {
  return getConfiguredAdminPhones().includes(String(phone || '').trim());
}
