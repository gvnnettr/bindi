'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { CallButton, WhatsAppButton } from '@/components/Contact';

interface MyOffer {
  id: string;
  monthlyPrice: string;
  note: string | null;
  status: string;
  vehicleId: string | null;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    plate: string;
  } | null;
}

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
  parent: { name: string; phone: string };
  students: Array<{
    name: string;
    class: string | null;
    school: { name: string } | null;
  }>;
  myOffers: MyOffer[];
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
}

const pickupLabel: Record<string, string> = {
  both: 'Gidiş + Dönüş',
  morning_only: 'Sadece Gidiş',
  afternoon_only: 'Sadece Dönüş',
};

export default function TalepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [price, setPrice] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [note, setNote] = useState('');

  async function load() {
    const token = providerSession.get();
    if (!token) return;
    try {
      const [d, v] = await Promise.all([
        apiGet<Detail>(`/me/requests/${id}`, token),
        apiGet<Vehicle[]>('/me/vehicles', token),
      ]);
      setDetail(d);
      setVehicles(v);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, [id]);

  async function submit() {
    const token = providerSession.get();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost(
        '/me/offers',
        {
          requestId: id,
          monthlyPrice: price,
          vehicleId: vehicleId || undefined,
          note: note || undefined,
        },
        token,
      );
      setPrice('');
      setNote('');
      setVehicleId('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function decline() {
    if (!confirm('Bu talebi reddetmek istediğinize emin misiniz? Listenizden kaldırılacak.'))
      return;
    const token = providerSession.get();
    if (!token) return;
    try {
      await apiPost(`/me/requests/${id}/decline`, {}, token);
      router.push('/servisci/talepler');
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  if (!detail) return <div className="text-charcoal-500">Yükleniyor…</div>;

  const offeredVehicleIds = new Set(detail.myOffers.map((o) => o.vehicleId));
  const availableVehicles = vehicles.filter((v) => !offeredVehicleIds.has(v.id));
  const canOffer = detail.status === 'open';

  const mapsUrl =
    detail.latitude && detail.longitude
      ? `https://www.google.com/maps?q=${detail.latitude},${detail.longitude}`
      : null;

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/servisci/talepler"
        className="inline-flex items-center gap-1 text-sm text-charcoal-500 hover:text-charcoal-900"
      >
        ← Talepler
      </Link>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
                  Talep Detayı
                </div>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-charcoal-900">
                  {detail.neighborhood}, {detail.district}/{detail.city}
                </h1>
              </div>
              <span className="badge-warning">{pickupLabel[detail.pickupType] ?? detail.pickupType}</span>
            </div>

            <div className="mt-6 space-y-4">
              <InfoRow label="Adres" value={detail.address} />
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
                  Konum
                </div>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-2 rounded-md bg-deepsea-50 px-3 py-2 text-sm font-semibold text-deepsea-700 hover:bg-deepsea-100"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="10" r="3" />
                      <path d="M12 2a8 8 0 018 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 018-8z" />
                    </svg>
                    Haritada Aç
                    <span className="text-xs text-deepsea-500">
                      ({detail.latitude!.toFixed(4)}, {detail.longitude!.toFixed(4)})
                    </span>
                  </a>
                ) : (
                  <div className="mt-1 text-sm text-charcoal-500">Konum paylaşılmadı</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
                  Veli
                </div>
                <div className="mt-1 font-semibold text-charcoal-900">{detail.parent.name}</div>
                {detail.parent.phone.startsWith('****') ? (
                  <div className="mt-1 text-sm text-charcoal-500">
                    {detail.parent.phone} — teklif verdiğinizde açılır
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CallButton phone={detail.parent.phone} size="sm" />
                    <WhatsAppButton
                      phone={detail.parent.phone}
                      size="sm"
                      message={`Merhaba ${detail.parent.name}, Servis Platform üzerinden teklifinizle ilgili ulaşıyorum.`}
                    />
                  </div>
                )}
              </div>
            </div>

            {detail.notes && (
              <div className="mt-4 rounded-lg bg-sand-50 p-4 text-sm text-charcoal-700">
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-charcoal-500">
                  Notlar
                </div>
                {detail.notes}
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold text-charcoal-900">Öğrenciler</h2>
            <div className="mt-4 space-y-3">
              {detail.students.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border border-charcoal-100 bg-sand-50/50 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sunset-100 text-sunset-700 font-bold">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-charcoal-900">{s.name}</div>
                    <div className="text-sm text-charcoal-600">
                      {s.class && `${s.class} · `}
                      {s.school?.name ?? 'Okul belirtilmemiş'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {detail.myOffers.length > 0 && (
            <section className="card p-6">
              <h2 className="text-lg font-bold text-charcoal-900">Verdiğim Teklifler</h2>
              <div className="mt-3 space-y-2">
                {detail.myOffers.map((o) => (
                  <div
                    key={o.id}
                    className={
                      'rounded-lg border p-3 text-sm ' +
                      (o.status === 'selected'
                        ? 'border-emerald-300 bg-emerald-50'
                        : o.status === 'rejected'
                          ? 'border-charcoal-100 bg-white opacity-60'
                          : 'border-charcoal-100 bg-white')
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-charcoal-900">
                        {Number(o.monthlyPrice).toLocaleString('tr-TR')} ₺/ay
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    {o.vehicle ? (
                      <div className="mt-1 text-xs text-charcoal-600">
                        🚐 {o.vehicle.brand} {o.vehicle.model} — {o.vehicle.plate}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-charcoal-500">Araç belirtilmedi</div>
                    )}
                    {o.note && (
                      <div className="mt-1 text-xs text-charcoal-600">{o.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {canOffer && (
            <section className="card p-6">
              <h2 className="text-lg font-bold text-charcoal-900">
                {detail.myOffers.length > 0 ? 'Başka Araç için Teklif Ver' : 'Teklif Ver'}
              </h2>
              <p className="mt-1 text-xs text-charcoal-500">
                Her araç için ayrı teklif verebilirsiniz. Teklif verildikten sonra değiştirilemez.
              </p>

              {availableVehicles.length === 0 && detail.myOffers.length > 0 ? (
                <div className="mt-4 rounded-lg bg-sand-50 p-4 text-sm text-charcoal-600">
                  Tüm araçlarınız için teklif verdiniz.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <Field label="Aylık Ücret (₺)">
                    <Input
                      type="number"
                      placeholder="2500"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </Field>
                  <Field label="Araç">
                    <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                      <option value="">— Araç seçin —</option>
                      {availableVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.brand} {v.model} ({v.year}) — {v.plate}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Açıklama (opsiyonel)">
                    <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                  <Button className="w-full" disabled={loading || !price} onClick={submit}>
                    Teklifi Gönder
                  </Button>
                </div>
              )}

              {detail.myOffers.length === 0 && (
                <button
                  onClick={decline}
                  className="mt-4 w-full text-center text-sm font-semibold text-red-500 hover:text-red-700"
                >
                  Bu talebi reddet
                </button>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-charcoal-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    pending: 'badge-warning',
    selected: 'badge-success',
    rejected: 'badge-neutral',
  };
  const label: Record<string, string> = {
    pending: 'Bekliyor',
    selected: 'Kazandı',
    rejected: 'Beklemede',
  };
  return <span className={cls[status] ?? 'badge-neutral'}>{label[status] ?? status}</span>;
}
