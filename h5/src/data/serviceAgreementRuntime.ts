import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  SERVICE_AGREEMENT_VERSION,
  ServiceDocument,
  ServiceDocumentKey,
  serviceDocumentOrder,
  serviceDocuments,
} from './serviceAgreement';
import { resolveApiBaseUrl } from '@/lib/env';

type ServiceAgreementContent = {
  version: string;
  order: ServiceDocumentKey[];
  documents: Record<ServiceDocumentKey, ServiceDocument>;
};

const fallbackContent: ServiceAgreementContent = {
  version: SERVICE_AGREEMENT_VERSION,
  order: serviceDocumentOrder,
  documents: serviceDocuments,
};

export async function loadServiceAgreementContent(): Promise<ServiceAgreementContent> {
  try {
    const response = await fetch(`${resolveApiBaseUrl()}/legal/service-agreement`, { cache: 'no-store' });
    if (response.ok) {
      const parsed = await response.json() as Partial<ServiceAgreementContent>;
      if (parsed.version && parsed.documents && Array.isArray(parsed.order)) {
        return {
          version: String(parsed.version),
          order: parsed.order.filter((key): key is ServiceDocumentKey => Boolean(parsed.documents?.[key])),
          documents: parsed.documents as Record<ServiceDocumentKey, ServiceDocument>,
        };
      }
    }
  } catch {}

  try {
    const filePath = path.join(process.cwd(), 'public', 'legal', 'service-agreement.json');
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ServiceAgreementContent>;
    if (!parsed.version || !parsed.documents || !Array.isArray(parsed.order)) return fallbackContent;

    return {
      version: String(parsed.version),
      order: parsed.order.filter((key): key is ServiceDocumentKey => Boolean(parsed.documents?.[key])),
      documents: parsed.documents as Record<ServiceDocumentKey, ServiceDocument>,
    };
  } catch {
    return fallbackContent;
  }
}
