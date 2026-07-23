'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { providerSession } from '@/lib/session';

interface DocRow {
  definition: {
    id: string;
    name: string;
    required: boolean;
  };
  document: {
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason: string | null;
  } | null;
}

interface Me {
  id: string;
  companyName: string;
  ownerName: string;
  status: string;
  vehicles: unknown[];
  subscriptions: Array<{
    packageCode: string;
    endsAt: string;
    approvedAt: string | null;
  }>;
}

export default function ProviderHomePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = providerSession.get();
    if (!token) return;
    apiGet<Me>('/me', token)
      .then(setMe)
      .catch((e) => setError((e as Error).message));
    apiGet<DocRow[]>('/me/documents', token)
      .then(setDocs)
      .catch(() => {});
  }, []);

  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  if (!me) return <div className="text-charcoal-500">Yükleniyor…</div>;

  const activeSubs = me.subscriptions.filter((s) => s.approvedAt);
  const teklif = activeSubs.find((s) => s.packageCode === 'teklif');
  const takip = activeSubs.find((s) => s.packageCode === 'takip');

  const requiredDocs = docs.filter((d) => d.definition.required);
  const missing = requiredDocs.filter((d) => !d.document);
  const pending = requiredDocs.filter((d) => d.document?.status === 'pending');
  const rejected = requiredDocs.filter((d) => d.document?.status === 'rejected');
  const approved = requiredDocs.filter((d) => d.document?.status === 'approved');

  return (
    <div className="space-y-8">
      {me.status !== 'active' && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <div className="text-sm font-bold text-amber-900">
                Hesabınız henüz aktif değil ({approved.length}/{requiredDocs.length} zorunlu belge onaylı)
              </div>
              <p className="mt-1 text-sm text-amber-800">
                Talepleri görüntüleyip teklif verebilmek için aşağıdaki tüm zorunlu belgelerin onaylanması gerekiyor.
              </p>

              {rejected.length > 0 && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                  <div className="text-xs font-bold text-red-900">
                    ✕ Reddedilen belgeler — tekrar yüklenmeli
                  </div>
                  <ul className="mt-1 list-disc pl-5 text-xs text-red-800">
                    {rejected.map((d) => (
                      <li key={d.definition.id}>
                        <b>{d.definition.name}</b>
                        {d.document?.rejectionReason && (
                          <span> — {d.document.rejectionReason}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {missing.length > 0 && (
                <div className="mt-3 rounded-md border border-amber-300 bg-white p-3">
                  <div className="text-xs font-bold text-amber-900">
                    ⏳ Henüz yüklenmemiş belgeler
                  </div>
                  <ul className="mt-1 list-disc pl-5 text-xs text-amber-800">
                    {missing.map((d) => (
                      <li key={d.definition.id}>{d.definition.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {pending.length > 0 && (
                <div className="mt-3 rounded-md border border-amber-300 bg-white p-3">
                  <div className="text-xs font-bold text-amber-900">
                    ⏱ Admin incelemesini bekleyen belgeler
                  </div>
                  <ul className="mt-1 list-disc pl-5 text-xs text-amber-800">
                    {pending.map((d) => (
                      <li key={d.definition.id}>{d.definition.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Link
                href="/servisci/belgelerim"
                className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
              >
                Belgelerim Sayfasına Git →
              </Link>
            </div>
          </div>
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="bg-charcoal-900 p-8 text-white">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-400">
                Hoş geldiniz
              </div>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
                {me.companyName}
              </h1>
              <p className="mt-1 text-sm text-charcoal-300">{me.ownerName}</p>
            </div>
            <Link href="/servisci/talepler" className="btn-primary">
              Talepleri Gör
            </Link>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <SubCard
            title="Teklif Paketi"
            active={!!teklif}
            endsAt={teklif?.endsAt}
          />
          <SubCard
            title="Takip Paketi"
            active={!!takip}
            endsAt={takip?.endsAt}
            note="Faz 2"
          />
          <div className="rounded-xl border border-charcoal-100 bg-sand-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
              Araç Sayısı
            </div>
            <div className="mt-2 text-3xl font-extrabold text-charcoal-900">
              {me.vehicles.length}
            </div>
            <Link
              href="/servisci/araclar"
              className="mt-2 inline-block text-xs font-semibold text-sunset-600 hover:text-sunset-700"
            >
              Yönet →
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <ActionCard
          href="/servisci/talepler"
          title="Yeni Talepler"
          desc="Bölgenize düşen açık talepleri incele, teklif ver."
          icon="📥"
        />
        <ActionCard
          href="/servisci/araclar"
          title="Araç Ekle"
          desc="Teklif verirken araç bilgilerin veliye görünür."
          icon="🚐"
        />
      </section>
    </div>
  );
}

function SubCard({
  title,
  active,
  endsAt,
  note,
}: {
  title: string;
  active: boolean;
  endsAt?: string;
  note?: string;
}) {
  return (
    <div
      className={
        'rounded-xl border p-5 ' +
        (active ? 'border-emerald-200 bg-emerald-50' : 'border-charcoal-100 bg-sand-50')
      }
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
          {title}
        </div>
        {note && <span className="badge-neutral">{note}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className={'text-lg font-bold ' + (active ? 'text-emerald-700' : 'text-charcoal-400')}>
          {active ? 'Aktif' : 'Pasif'}
        </div>
      </div>
      {active && endsAt && (
        <div className="mt-1 text-xs text-charcoal-600">
          Bitiş: {new Date(endsAt).toLocaleDateString('tr-TR')}
        </div>
      )}
    </div>
  );
}

function ActionCard({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="card group flex items-start gap-4 p-6 transition hover:shadow-card-hover"
    >
      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-sand-100 text-2xl">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-bold text-charcoal-900">{title}</div>
        <div className="mt-1 text-sm text-charcoal-600">{desc}</div>
      </div>
      <svg
        className="mt-2 h-5 w-5 text-charcoal-300 transition group-hover:text-sunset-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
