import content from '../../public/legal/service-agreement.json';

export type ServiceDocumentKey =
  | 'user-service-agreement'
  | 'platform-disclaimer'
  | 'idle-publish-rules'
  | 'wanted-publish-rules'
  | 'provider-commitment'
  | 'trade-safety';

export type ServiceDocument = {
  title: string;
  summary: string;
  paragraphs: string[];
};

export const SERVICE_AGREEMENT_VERSION = content.version;

export const serviceDocuments = content.documents as Record<ServiceDocumentKey, ServiceDocument>;

export const serviceDocumentOrder = content.order as ServiceDocumentKey[];
