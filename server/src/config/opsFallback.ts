export type CommunityOption = {
  name: string;
  district: string;
  lat: number;
  lng: number;
  enabled?: boolean;
  sort?: number;
};

export type OpsConfig = {
  auth_mode: 'phone_code';
  require_publish_review: boolean;
  image_upload_provider: string;
  image_upload_max_count: number;
  image_upload_max_mb: number;
  announcement: string;
  support_contact: string;
  qq_mail_enabled: boolean;
};

export const FALLBACK_COMMUNITIES: CommunityOption[] = [
  { name: '梧桐湾', district: '东门口周边', lat: 32.0106, lng: 112.1321, enabled: true, sort: 10 },
  { name: '清华园', district: '东门口周边', lat: 32.0049, lng: 112.1296, enabled: true, sort: 20 },
  { name: '丽江泊林', district: '东门口周边', lat: 32.0118, lng: 112.1213, enabled: true, sort: 30 },
  { name: '在水一方', district: '东门口周边', lat: 32.0123, lng: 112.1202, enabled: true, sort: 40 },
  { name: '怡和苑', district: '东门口周边', lat: 32.0098, lng: 112.1278, enabled: true, sort: 50 },
];

export const DEFAULT_OPS_CONFIG: OpsConfig = {
  auth_mode: 'phone_code',
  require_publish_review: false,
  image_upload_provider: 'local',
  image_upload_max_count: 6,
  image_upload_max_mb: 8,
  announcement: '东门口邻里轻松流转童年好物，先沟通，再约时间。',
  support_contact: 'demo@qq.com',
  qq_mail_enabled: false,
};
