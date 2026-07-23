'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function TokenLink() {
  const params = useSearchParams();
  const token = params.get('token');
  if (!token) return null;
  return (
    <div className="mt-6">
      <Link
        href={`/talep/${token}`}
        className="inline-flex rounded-md bg-brand-600 px-5 py-3 text-white hover:bg-brand-700"
      >
        Teklifleri Görüntüle
      </Link>
    </div>
  );
}

export default function TesekkurlerPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl">
        ✓
      </div>
      <h1 className="text-3xl font-bold">Talebiniz alındı</h1>
      <p className="mt-4 text-slate-600">
        Uygun servisçilere bildirim gönderildi. Teklifler geldikçe SMS ile
        bilgilendireceğiz.
      </p>
      <Suspense fallback={null}>
        <TokenLink />
      </Suspense>
    </main>
  );
}
