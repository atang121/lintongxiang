import type { Metadata } from 'next';
import { Suspense } from 'react';

import ShareHandler from './share-handler';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickText(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) return value[0] || fallback;
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const title = pickText(params.title, '童邻市集');
  const desc = pickText(params.desc, '邻里社区儿童闲置公益流转平台');
  const image = pickText(params.img, '/og-image.svg');

  return {
    title: `${title} - 童邻市集`,
    description: desc,
    openGraph: {
      title: `${title} - 童邻市集`,
      description: desc,
      images: [image],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - 童邻市集`,
      description: desc,
      images: [image],
    },
  };
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const itemId = pickText(params.itemId, '');
  const path = pickText(params.path, '/');
  const title = pickText(params.title, '童邻市集');
  const desc = pickText(params.desc, '邻里社区儿童闲置公益流转平台');
  const img = pickText(params.img, '/og-image.svg');

  return (
    <Suspense fallback={null}>
      <ShareHandler itemId={itemId} path={path} title={title} desc={desc} img={img} />
    </Suspense>
  );
}
