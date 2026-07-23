'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { formatPhone } from '@/components/Contact';

interface Detail {
  id: string;
  status: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  pickupType: string;
  notes: string | null;
  magicToken: string;
  createdAt: string;
  parent: { id: string; name: string; phone: string; email: string | null };
  students: Array<{
    id: string;
    name: string;
    class: string | null;
    school: { id: string; name: string; city: string; district: string } | null;
  }>;
  offers: Array<{
    id: string;
    monthlyPrice: number;
    note: string | null;
    status: string;
    createdAt: string;
    selectedAt: string | null;
    provider: {
      id: string;
      companyName: string;
      ownerName: string;
      phone: string;
      email: string | null;
    };
    vehicle: {
      brand: string;
      model: string;
      year: number | null;
      plate: string;
      seats: number | null;
    } | null;
  }>;
  stats: {
    offerCount: number;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
  };
}

export default function AdminRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = adminSession.get();
    if (!token) return;
    apiGet<Detail>(`/admin/requests/${id}`, token)
      .then(setD)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  if (!d) return <div className="text-charcoal-500">Yükleniyor…</div>;

  const magicLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/talep/${d.magicToken}`
      : '';

  return (
    <div className="space-y-6">
      <div className="text-sm">
        <Link href="/admin/talepler" className="text-charcoal-500 hover:text-charcoal-900">
          ← Talepler
        </Link>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-charcoal-900">
                Talep #{d.id.slice(0, 8)}
              </h1>
              <StatusPill status={d.status} />
            </div>
            <div className="mt-2 text-sm text-charcoal-600">
              {d.neighborhood}, {d.district}/{d.city}
            </div>
            <div className="text-xs text-charcoal-500">
              Oluşturulma: {new Date(d.createdAt).toLocaleString('tr-TR')}
            </div>
          </div>
          <div>
            <a
              href={magicLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg border border-charcoal-200 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-700 hover:bg-sand-50"
            >
              🔗 Veli Görünümü
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 text-sm md:grid-cols-4">
          <Stat label="Teklif Sayısı" value={d.stats.offerCount} />
          <Stat
            label="En Düşük"
            value={d.stats.minPrice ? '₺' + d.stats.minPrice.toLocaleString('tr-TR') : '—'}
          />
          <Stat
            label="En Yüksek"
            value={d.stats.maxPrice ? '₺' + d.stats.maxPrice.toLocaleString('tr-TR') : '—'}
          />
          <Stat
            label="Ortalama"
            value={
              d.stats.avgPrice
                ? '₺' + Math.round(d.stats.avgPrice).toLocaleString('tr-TR')
                : '—'
            }
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-charcoal-500">
            Veli
          </h3>
          <Info label="Ad" value={d.parent.name} />
          <Info label="Telefon" value={formatPhone(d.parent.phone)} />
          {d.parent.email && <Info label="E-posta" value={d.parent.email} />}
          <div className="mt-3 flex gap-2">
            <a
              href={`tel:${d.parent.phone}`}
              className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-emerald-600"
            >
              📞 Ara
            </a>
            <a
              href={`https://wa.me/${d.parent.phone.replace(/\D/g, '').replace(/^0/, '90')}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-lg bg-green-500 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-green-600"
            >
              💬 WhatsApp
            </a>
          </div>
        </div>

        <div className="card p-6 lg:col-span-1">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-charcoal-500">
            Adres & Konum
          </h3>
          <Info label="Şehir" value={`${d.district}/${d.city}`} />
          <Info label="Mahalle" value={d.neighborhood} />
          {d.address && <Info label="Adres" value={d.address} />}
          {d.latitude != null && d.longitude != null && (
            <div className="mt-2">
              <a
                href={`https://maps.google.com/?q=${d.latitude},${d.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-sunset-600 hover:text-sunset-700"
              >
                📍 Haritada Aç ({d.latitude.toFixed(4)}, {d.longitude.toFixed(4)})
              </a>
            </div>
          )}
          <div className="mt-3 border-t border-charcoal-100 pt-3">
            <Info label="Gidiş Türü" value={pickupLabel(d.pickupType)} />
          </div>
        </div>

        <div className="card p-6 lg:col-span-1">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-charcoal-500">
            Öğrenciler ({d.students.length})
          </h3>
          {d.students.length === 0 ? (
            <div className="text-sm text-charcoal-500">Öğrenci yok.</div>
          ) : (
            <ul className="space-y-3">
              {d.students.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-charcoal-100 bg-sand-50/40 p-3"
                >
                  <div className="text-sm font-semibold text-charcoal-900">{s.name}</div>
                  {s.class && (
                    <div className="text-xs text-charcoal-500">Sınıf: {s.class}</div>
                  )}
                  {s.school && (
                    <div className="mt-1 text-xs text-charcoal-600">
                      🏫 {s.school.name}
                      <span className="text-charcoal-400">
                        {' '}
                        · {s.school.district}/{s.school.city}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {d.notes && (
        <div className="card p-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-charcoal-500">
            Veli Notu
          </h3>
          <p className="whitespace-pre-line text-sm text-charcoal-700">{d.notes}</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-charcoal-100 bg-sand-50 px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-500">
            Tüm Teklifler ({d.offers.length})
          </h3>
          <p className="mt-1 text-xs text-charcoal-500">
            Fiyata göre sıralı — en ucuzdan en pahalıya.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-charcoal-100 bg-white text-left text-xs uppercase tracking-wider text-charcoal-500">
            <tr>
              <th className="px-6 py-3">Servisçi</th>
              <th className="px-6 py-3">Araç</th>
              <th className="px-6 py-3 text-right">Fiyat</th>
              <th className="px-6 py-3">Durum</th>
              <th className="px-6 py-3">Verilme</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {d.offers.map((o) => (
              <tr
                key={o.id}
                className={
                  'hover:bg-sand-50/40 ' +
                  (o.status === 'selected' ? 'bg-emerald-50/40' : '')
                }
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/servisciler/${o.provider.id}`}
                    className="font-semibold text-charcoal-900 hover:text-sunset-600"
                  >
                    {o.provider.companyName}
                  </Link>
                  <div className="text-xs text-charcoal-500">
                    {o.provider.ownerName} · {formatPhone(o.provider.phone)}
                  </div>
                  {o.note && (
                    <div className="mt-1 text-xs italic text-charcoal-600">
                      "{o.note}"
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-charcoal-700">
                  {o.vehicle ? (
                    <div>
                      <div>
                        {o.vehicle.brand} {o.vehicle.model}{' '}
                        {o.vehicle.year && `(${o.vehicle.year})`}
                      </div>
                      <div className="text-xs text-charcoal-500">
                        {o.vehicle.plate} · {o.vehicle.seats ?? '—'} kişilik
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-charcoal-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-lg font-black text-charcoal-900">
                    ₺{o.monthlyPrice.toLocaleString('tr-TR')}
                  </div>
                  <div className="text-xs text-charcoal-500">/ aylık</div>
                </td>
                <td className="px-6 py-4">
                  {o.status === 'selected' ? (
                    <span className="badge-success">Seçildi</span>
                  ) : o.status === 'rejected' ? (
                    <span className="badge-neutral">Reddedildi</span>
                  ) : (
                    <span className="badge-warning">Bekliyor</span>
                  )}
                  {o.selectedAt && (
                    <div className="mt-1 text-[11px] text-emerald-700">
                      {new Date(o.selectedAt).toLocaleString('tr-TR')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-charcoal-500">
                  {new Date(o.createdAt).toLocaleString('tr-TR')}
                </td>
              </tr>
            ))}
            {d.offers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-16 text-center text-sm text-charcoal-500"
                >
                  Henüz teklif verilmedi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-charcoal-100 bg-sand-50/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-charcoal-900">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">
        {label}
      </div>
      <div className="text-sm text-charcoal-900">{value}</div>
    </div>
  );
}

function pickupLabel(v: string) {
  return v === 'both'
    ? 'Gidiş + Dönüş'
    : v === 'morning_only'
      ? 'Sadece Sabah'
      : v === 'afternoon_only'
        ? 'Sadece Öğleden Sonra'
        : v;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    open: { cls: 'badge-warning', label: 'Açık' },
    matched: { cls: 'badge-info', label: 'Eşleşti' },
    closed: { cls: 'badge-success', label: 'Kapandı' },
    cancelled: { cls: 'badge-neutral', label: 'İptal' },
  };
  const m = map[status] ?? { cls: 'badge-neutral', label: status };
  return <span className={m.cls}>{m.label}</span>;
}
