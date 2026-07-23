'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui';
import { CallButton, WhatsAppButton } from '@/components/Contact';

interface Offer {
  id: string;
  monthlyPrice: string;
  note: string | null;
  status: string;
  createdAt: string;
  provider: {
    id: string;
    companyName: string;
    ownerName: string;
    phone: string | null;
    rating: { avg: number; count: number } | null;
  };
  vehicle: {
    brand: string;
    model: string;
    year: number;
    plate: string;
    seats: number;
  } | null;
}

interface RequestDetail {
  id: string;
  status: string;
  city: string;
  district: string;
  neighborhood: string;
  offers: Offer[];
  requestStudents: Array<{
    student: { name: string; school: { name: string } | null };
  }>;
}

export default function TalepPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await apiGet<RequestDetail>(`/requests/${token}`);
      setRequest(data);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, [token]);

  async function select(offerId: string) {
    if (!confirm('Bu servisçiyi seçmek istediğinize emin misiniz?')) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/requests/${token}/offers/select`, { offerId });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="rounded-md border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      </main>
    );
  }
  if (!request)
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center text-charcoal-500">
        Yükleniyor…
      </main>
    );

  const closed = request.status === 'closed';
  const selected = request.offers.find((o) => o.status === 'selected');

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-charcoal-900">
            Servis Teklifleriniz
          </h1>
          <p className="mt-1 text-sm text-charcoal-600">
            {request.neighborhood}, {request.district}/{request.city} —{' '}
            {request.requestStudents.map((rs) => rs.student.name).join(', ')}
          </p>
        </div>
        <Link
          href="/veli/giris"
          className="rounded-lg border border-charcoal-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal-700 hover:border-sunset-500 hover:text-sunset-600"
        >
          Veli Paneli →
        </Link>
      </header>

      {closed && selected && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <strong>{selected.provider.companyName}</strong> servisini seçtiniz.
          Servisçiye bildirildi, sizinle iletişime geçilecek.{' '}
          <Link href="/veli/giris" className="underline">
            Veli panelinden puanlayabilirsiniz →
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {request.offers.length === 0 && (
          <div className="rounded-xl border border-dashed border-charcoal-200 bg-white p-16 text-center text-sm text-charcoal-500">
            Henüz teklif gelmedi. Teklifler geldikçe SMS ile bilgilendireceğiz.
          </div>
        )}
        {request.offers.map((o) => (
          <div
            key={o.id}
            className={
              'card p-6 transition ' +
              (o.status === 'selected'
                ? 'border-emerald-300 bg-emerald-50/40'
                : o.status === 'rejected'
                  ? 'opacity-60'
                  : '')
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-charcoal-900 font-black text-white">
                  {o.provider.companyName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-bold text-charcoal-900">
                    {o.provider.companyName}
                  </div>
                  <div className="text-sm text-charcoal-600">{o.provider.ownerName}</div>
                  <div className="mt-1.5">
                    <Rating
                      value={o.provider.rating?.avg}
                      count={o.provider.rating?.count}
                    />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold text-sunset-600">
                  {Number(o.monthlyPrice).toLocaleString('tr-TR')} ₺
                </div>
                <div className="text-xs text-charcoal-500">aylık</div>
              </div>
            </div>

            {o.vehicle && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-sand-50 p-3 text-sm text-charcoal-700">
                <span>🚐</span>
                <span>
                  <strong>{o.vehicle.brand} {o.vehicle.model}</strong> ({o.vehicle.year})
                  — {o.vehicle.seats} kişilik — Plaka: {o.vehicle.plate}
                </span>
              </div>
            )}
            {o.note && (
              <p className="mt-3 whitespace-pre-line text-sm text-charcoal-700">
                {o.note}
              </p>
            )}

            {!closed && o.status === 'pending' && (
              <div className="mt-4">
                <Button disabled={loading} onClick={() => select(o.id)}>
                  Bu Servisçiyi Seç
                </Button>
              </div>
            )}
            {o.status === 'selected' && (
              <div className="mt-4 rounded-lg bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <span>✓</span> Bu servisçiyi seçtiniz
                </div>
                {o.provider.phone && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CallButton phone={o.provider.phone} size="sm" />
                    <WhatsAppButton
                      phone={o.provider.phone}
                      size="sm"
                      message="Merhaba, Servis Platform üzerinden teklifinizi seçtim."
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

function Rating({ value, count }: { value: number | undefined; count?: number }) {
  if (!value || !count)
    return <span className="text-xs text-charcoal-400">Henüz puan yok</span>;
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-sunset-500">★</span>
      <span className="font-semibold text-charcoal-900">{value.toFixed(1)}</span>
      <span className="text-xs text-charcoal-500">({count} yorum)</span>
    </div>
  );
}
