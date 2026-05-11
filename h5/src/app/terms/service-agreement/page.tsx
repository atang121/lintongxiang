import { redirect } from 'next/navigation';

import { loadServiceAgreementContent } from '@/data/serviceAgreementRuntime';

export const dynamic = 'force-dynamic';

export default async function ServiceAgreementPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; return_to?: string }>;
}) {
  const { from, return_to } = await searchParams;
  const { order } = await loadServiceAgreementContent();
  const params = new URLSearchParams();
  params.set('from', from || 'profile');
  if (return_to) params.set('return_to', return_to);
  redirect(`/terms/${order[0] || 'user-service-agreement'}?${params.toString()}`);
}
