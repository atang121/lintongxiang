import { FALLBACK_COMMUNITIES, DEFAULT_OPS_CONFIG, OpsConfig } from '../config/opsFallback';
import { query, run, uuid } from '../models/db';
import {
  createReviewRecordInFeishu,
  isFeishuBaseConfigured,
  loadCommunitiesFromFeishu,
  loadOpsConfigFromFeishu,
} from './feishuBase';
import { getMailService } from './mail';
import { getStorageProviderLabel, isStorageReady } from './storage';

type ReviewRecord = {
  id: string;
  item_id: string;
  title: string;
  owner_id: string;
  owner_nickname: string;
  community: string;
  cover_image: string;
  status: string;
  provider: string;
  created_at: string;
};

export type OpsBootstrap = {
  communities: typeof FALLBACK_COMMUNITIES;
  config: OpsConfig;
  source: {
    feishu_enabled: boolean;
    mail_provider: 'preview' | 'smtp';
    image_upload_provider: string;
    image_upload_ready: boolean;
  };
};

export interface OpsService {
  getBootstrap: () => Promise<OpsBootstrap>;
  submitPublishReview: (payload: {
    itemId: string;
    title: string;
    ownerId: string;
    ownerNickname: string;
    community: string;
    coverImage?: string;
  }) => Promise<{ provider: string; status: string }>;
  listReviews: () => Promise<ReviewRecord[]>;
}

let serviceOverride: OpsService | null = null;

const PILOT_COMMUNITY_NAMES = new Set(FALLBACK_COMMUNITIES.map((community) => community.name));

function mergeCommunities(remote: typeof FALLBACK_COMMUNITIES) {
  if (remote.length === 0) return FALLBACK_COMMUNITIES;
  const remoteByName = new Map(remote.map((community) => [community.name, community]));

  return FALLBACK_COMMUNITIES.map((fallback) => {
    const remoteMatch = remoteByName.get(fallback.name);
    return remoteMatch
      ? { ...fallback, lat: remoteMatch.lat ?? fallback.lat, lng: remoteMatch.lng ?? fallback.lng }
      : fallback;
  }).filter((community) => PILOT_COMMUNITY_NAMES.has(community.name));
}

function sanitizeConfig(remote: Partial<OpsConfig>): OpsConfig {
  return {
    ...DEFAULT_OPS_CONFIG,
    ...Object.fromEntries(Object.entries(remote).filter(([, value]) => value !== undefined)),
    image_upload_provider: getStorageProviderLabel(),
    qq_mail_enabled: getMailService().getMode() === 'smtp',
  };
}

function createOpsService(): OpsService {
  return {
    async getBootstrap() {
      let communities = FALLBACK_COMMUNITIES;
      let remoteConfig: Partial<OpsConfig> = {};
      let feishuEnabled = false;

      if (isFeishuBaseConfigured()) {
        try {
          communities = mergeCommunities(await loadCommunitiesFromFeishu());
          remoteConfig = await loadOpsConfigFromFeishu();
          feishuEnabled = true;
        } catch (error) {
          console.error('Feishu Base bootstrap failed, fallback to local config:', error);
        }
      }

      return {
        communities,
        config: sanitizeConfig(remoteConfig),
        source: {
          feishu_enabled: feishuEnabled,
          mail_provider: getMailService().getMode(),
          image_upload_provider: getStorageProviderLabel(),
          image_upload_ready: isStorageReady(),
        },
      };
    },

    async submitPublishReview(payload) {
      const localId = 'review_' + uuid().slice(0, 8);
      let provider = 'local';

      try {
        if (await createReviewRecordInFeishu(payload)) {
          provider = 'feishu';
        }
      } catch (error) {
        console.error('Feishu review submit failed, fallback to local queue:', error);
      }

      run(
        `INSERT INTO review_queue
          (id, item_id, title, owner_id, owner_nickname, community, cover_image, status, provider, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          localId,
          payload.itemId,
          payload.title,
          payload.ownerId,
          payload.ownerNickname,
          payload.community,
          payload.coverImage || '',
          'submitted',
          provider,
        ]
      );

      return {
        provider,
        status: 'submitted',
      };
    },

    async listReviews() {
      return query(
        `SELECT id, item_id, title, owner_id, owner_nickname, community, cover_image, status, provider, created_at
         FROM review_queue
         ORDER BY datetime(created_at) DESC
         LIMIT 100`
      ) as ReviewRecord[];
    },
  };
}

export function getOpsService() {
  if (serviceOverride) return serviceOverride;
  return createOpsService();
}

export function setOpsServiceForTests(service: OpsService) {
  serviceOverride = service;
}

export function resetOpsServiceForTests() {
  serviceOverride = null;
}
