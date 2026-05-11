export type CommunityOption = {
  name: string;
  district: string;
  lat: number;
  lng: number;
};

export const PILOT_AREA_LABEL = '东门口周边';

export const XIANGYANG_COMMUNITIES: CommunityOption[] = [
  { name: '梧桐湾', district: PILOT_AREA_LABEL, lat: 32.0106, lng: 112.1321 },
  { name: '清华园', district: PILOT_AREA_LABEL, lat: 32.0049, lng: 112.1296 },
  { name: '丽江泊林', district: PILOT_AREA_LABEL, lat: 32.0118, lng: 112.1213 },
  { name: '在水一方', district: PILOT_AREA_LABEL, lat: 32.0123, lng: 112.1202 },
  { name: '怡和苑', district: PILOT_AREA_LABEL, lat: 32.0098, lng: 112.1278 },
];

const PILOT_COMMUNITY_NAMES = new Set(XIANGYANG_COMMUNITIES.map((community) => community.name));

export function normalizePilotCommunities(remote: CommunityOption[] = []) {
  const remoteByName = new Map(remote.map((community) => [community.name, community]));

  return XIANGYANG_COMMUNITIES.map((fallback) => {
    const remoteMatch = remoteByName.get(fallback.name);
    return remoteMatch
      ? { ...fallback, lat: remoteMatch.lat ?? fallback.lat, lng: remoteMatch.lng ?? fallback.lng }
      : fallback;
  }).filter((community) => PILOT_COMMUNITY_NAMES.has(community.name));
}

export function findStandardCommunityName(input: string) {
  const normalized = input.trim().replace(/\s+/g, '').replace(/小区$/u, '');
  if (!normalized) return null;

  return XIANGYANG_COMMUNITIES.find((community) => {
    const standard = community.name.replace(/\s+/g, '');
    return standard === normalized || standard.replace(/小区$/u, '') === normalized;
  }) || null;
}

export function findNearestCommunity(lat: number, lng: number) {
  return XIANGYANG_COMMUNITIES
    .map((community) => ({
      ...community,
      distance:
        (community.lat - lat) * (community.lat - lat) +
        (community.lng - lng) * (community.lng - lng),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
}
