export type CommunityOption = {
  name: string;
  district: string;
  lat: number;
  lng: number;
  enabled?: boolean;
  sort?: number;
};

export type OpsConfig = {
  auth_mode: 'qq_email_code';
  require_publish_review: boolean;
  image_upload_provider: string;
  image_upload_max_count: number;
  image_upload_max_mb: number;
  announcement: string;
  support_contact: string;
  qq_mail_enabled: boolean;
};

export const FALLBACK_COMMUNITIES: CommunityOption[] = [
  { name: '民发・庞公别苑', district: '襄城区', lat: 32.0078, lng: 112.1264, enabled: true, sort: 10 },
  { name: '梧桐湾', district: '樊城区', lat: 32.0106, lng: 112.1321, enabled: true, sort: 20 },
  { name: '清华园', district: '襄城区', lat: 32.0049, lng: 112.1296, enabled: true, sort: 30 },
  { name: '在水一方', district: '樊城区', lat: 32.0123, lng: 112.1202, enabled: true, sort: 40 },
  { name: '北京公馆', district: '高新区', lat: 32.0174, lng: 112.1366, enabled: true, sort: 50 },
  { name: '华凯・丽江泊林', district: '高新区', lat: 32.0068, lng: 112.1408, enabled: true, sort: 60 },
  { name: '中房泰鑫花园', district: '樊城区', lat: 32.0231, lng: 112.1463, enabled: true, sort: 70 },
  { name: '庞公春晓', district: '襄城区', lat: 32.0019, lng: 112.1188, enabled: true, sort: 80 },
];

export const DEFAULT_OPS_CONFIG: OpsConfig = {
  auth_mode: 'qq_email_code',
  require_publish_review: false,
  image_upload_provider: 'local',
  image_upload_max_count: 6,
  image_upload_max_mb: 8,
  announcement: '邻里之间轻松流转童年好物，先沟通，再约时间。',
  support_contact: 'demo@qq.com',
  qq_mail_enabled: false,
};
