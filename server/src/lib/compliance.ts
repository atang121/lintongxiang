import { getOne, run } from '../models/db';
import { getLatestServiceAgreement } from '../services/serviceAgreement';
import fallbackConfig from '../config/serviceAgreement.json';

export function getServiceAgreementVersion() {
  return getLatestServiceAgreement().version;
}

export const SERVICE_AGREEMENT_VERSION = String((fallbackConfig as any).version || '2026-05-04');

export function hasAcceptedServiceAgreement(userId: string) {
  const user = getOne(
    'SELECT service_agreement_version FROM users WHERE id = ?',
    [userId]
  ) as Record<string, any> | null;

  return String(user?.service_agreement_version || '') === getServiceAgreementVersion();
}

export function requireServiceAgreement(userId: string) {
  return hasAcceptedServiceAgreement(userId)
    ? null
    : { error: '请先阅读并同意《童邻市集用户服务协议》', code: 'SERVICE_AGREEMENT_REQUIRED' };
}

export function acceptServiceAgreement(userId: string, source = 'account') {
  run(
    `UPDATE users
     SET service_agreement_version = ?, service_agreement_confirmed_at = datetime('now'), service_agreement_source = ?
     WHERE id = ?`,
    [getServiceAgreementVersion(), String(source || 'account').slice(0, 32), userId]
  );
}
