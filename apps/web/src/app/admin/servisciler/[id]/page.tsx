'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button } from '@/components/ui';

interface Detail {
  id: string;
  companyName: string;
  taxNo: string | null;
  ownerName: string;
  email: string | null;
  phone: string;
  address: string | null;
  status: string;
  createdAt: string;
  schools: Array<{
    id: string;
    school: { id: string; name: string; city: string; district: string };
  }>;
  regions: Array<{
    id: string;
    city: string;
    district: string;
    latitude: number | null;
    longitude: number | null;
    radiusKm: number | null;
    label: string | null;
  }>;
  subscriptions: Array<{
    id: string;
    packageCode: string;
    startsAt: string | null;
    endsAt: string | null;
    approvedAt: string | null;
    receiptUrl: string | null;
  }>;
  vehicles: Array<{
    id: string;
    brand: string;
    model: string;
    year: number | null;
    plate: string;
    seats: number | null;
  }>;
  offers: Array<{
    id: string;
    monthlyPrice: number;
    status: string;
    createdAt: string;
    selectedAt: string | null;
    request: {
      id: string;
      city: string | null;
      district: string | null;
      neighborhood: string | null;
      parentName: string | null;
    };
  }>;
  stats: {
    wonCount: number;
    wonTotal: number;
    offerCount: number;
    ratingAvg: number;
    ratingCount: number;
  };
}

type Tab =
  | 'genel'
  | 'belgeler'
  | 'arac_belgeler'
  | 'sofor_belgeler'
  | 'abonelikler'
  | 'araclar'
  | 'okullar'
  | 'teklifler';

interface VehicleDocGroup {
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
    seats: number;
  };
  documents: DocRow[];
}

interface DriverDocGroup {
  driver: {
    id: string;
    name: string;
    phone: string;
    tcNo: string | null;
    licenseClass: string | null;
    active: boolean;
  };
  documents: DocRow[];
}

interface DocRow {
  definition: {
    id: string;
    code: string;
    name: string;
    required: boolean;
    requiresExpiry: boolean;
    description: string | null;
  };
  document: {
    id: string;
    fileUrl: string;
    originalName: string | null;
    issuedAt: string | null;
    expiresAt: string | null;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason: string | null;
    reviewedAt: string | null;
    createdAt: string;
    daysToExpiry: number | null;
    expiryStatus: 'ok' | 'soon' | 'expired' | 'na';
  } | null;
}

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [detail, setDetail] = useState<Detail | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [vehicleDocs, setVehicleDocs] = useState<VehicleDocGroup[]>([]);
  const [driverDocs, setDriverDocs] = useState<DriverDocGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('genel');
  const [edit, setEdit] = useState(false);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectDocKind, setRejectDocKind] = useState<
    'company' | 'vehicle' | 'driver'
  >('company');
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({
    companyName: '',
    taxNo: '',
    ownerName: '',
    email: '',
    address: '',
  });

  async function load() {
    const token = adminSession.get();
    if (!token) return;
    try {
      const [d, docList, vDocs, dDocs] = await Promise.all([
        apiGet<Detail>(`/admin/providers/${id}`, token),
        apiGet<DocRow[]>(`/admin/providers/${id}/documents`, token).catch(
          () => [],
        ),
        apiGet<VehicleDocGroup[]>(
          `/admin/providers/${id}/vehicle-documents`,
          token,
        ).catch(() => []),
        apiGet<DriverDocGroup[]>(
          `/admin/providers/${id}/drivers`,
          token,
        ).catch(() => []),
      ]);
      setDetail(d);
      setDocs(docList);
      setVehicleDocs(vDocs);
      setDriverDocs(dDocs);
      setForm({
        companyName: d.companyName,
        taxNo: d.taxNo ?? '',
        ownerName: d.ownerName,
        email: d.email ?? '',
        address: d.address ?? '',
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function reviewPath(kind: 'company' | 'vehicle' | 'driver', docId: string) {
    if (kind === 'company')
      return `/admin/providers/${id}/documents/${docId}/review`;
    if (kind === 'vehicle')
      return `/admin/vehicle-documents/${docId}/review`;
    return `/admin/driver-documents/${docId}/review`;
  }

  async function approveDoc(
    kind: 'company' | 'vehicle' | 'driver',
    docId: string,
  ) {
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPost(reviewPath(kind, docId), { decision: 'approved' }, token);
      setNotice('Belge onaylandı.');
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function rejectDoc() {
    if (!rejectingDocId || !rejectReason.trim()) return;
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPost(
        reviewPath(rejectDocKind, rejectingDocId),
        { decision: 'rejected', rejectionReason: rejectReason.trim() },
        token,
      );
      setRejectingDocId(null);
      setRejectReason('');
      setNotice('Belge reddedildi.');
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function finalizeReview() {
    const monthsRaw = prompt('Abonelik süresi (ay)?', '12');
    if (!monthsRaw) return;
    const months = Number(monthsRaw);
    if (!months || months < 1) return;
    const token = adminSession.get();
    if (!token) return;
    try {
      const r = await apiPost<{
        ok: boolean;
        status: string;
        rejectedCount: number;
      }>(
        `/admin/providers/${id}/finalize-review`,
        { months },
        token,
      );
      if (r.rejectedCount > 0) {
        setNotice(
          `İncelemeniz kaydedildi. ${r.rejectedCount} belge reddedildi — servisçiye SMS ile bildirildi, tekrar yükleyecek.`,
        );
      } else {
        setNotice(
          'Servisçi onaylandı ve aktifleştirildi. Giriş bilgileri SMS ile gönderildi.',
        );
      }
      setTimeout(() => setNotice(null), 5000);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function save() {
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPatch(`/admin/providers/${id}`, form, token);
      setEdit(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function setStatus(status: string) {
    const labels: Record<string, string> = {
      active: 'aktif etmek',
      suspended: 'pasif etmek (askıya almak)',
      pending_approval: 'onay bekliyor durumuna almak',
    };
    if (!confirm(`Bu servisçiyi ${labels[status]} istediğinizden emin misiniz?`)) return;
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPatch(`/admin/providers/${id}/status`, { status }, token);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeProvider() {
    if (
      !confirm(
        'Bu servisçiyi SİLMEK istediğinizden emin misiniz? Kayıtlı teklifleri varsa askıya alınır (soft delete).',
      )
    )
      return;
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiDelete(`/admin/providers/${id}`, token);
      router.push('/admin/servisciler');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function extendSubscription(subId: string) {
    const monthsRaw = prompt('Kaç ay uzatılsın?', '12');
    if (!monthsRaw) return;
    const months = Number(monthsRaw);
    if (!months || months < 1) return;
    const sub = detail!.subscriptions.find((s) => s.id === subId)!;
    const currentEnd = sub.endsAt ? new Date(sub.endsAt) : new Date();
    const base = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(base);
    newEnd.setMonth(newEnd.getMonth() + months);
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPatch(
        `/admin/providers/${id}/subscriptions/${subId}`,
        {
          startsAt: sub.startsAt ?? new Date().toISOString(),
          endsAt: newEnd.toISOString(),
          approve: !sub.approvedAt,
        },
        token,
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function editEndsAt(subId: string) {
    const sub = detail!.subscriptions.find((s) => s.id === subId)!;
    const current = sub.endsAt ? new Date(sub.endsAt).toISOString().slice(0, 10) : '';
    const val = prompt('Bitiş tarihi (YYYY-MM-DD):', current);
    if (!val) return;
    const d = new Date(val);
    if (isNaN(d.getTime())) return;
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPatch(
        `/admin/providers/${id}/subscriptions/${subId}`,
        { endsAt: d.toISOString() },
        token,
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!detail) {
    return <div className="text-charcoal-500">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/admin/servisciler"
          className="text-charcoal-500 hover:text-charcoal-900"
        >
          ← Servisçiler
        </Link>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-charcoal-900 text-white text-lg font-black">
              {detail.companyName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-charcoal-900">
                {detail.companyName}
              </h1>
              <div className="mt-1 text-sm text-charcoal-600">
                {detail.ownerName} — {detail.phone}
              </div>
              <div className="mt-2">
                <StatusPill status={detail.status} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {detail.status === 'pending_approval' && (
              <Button onClick={finalizeReview}>Onay & SMS Gönder</Button>
            )}
            {detail.status !== 'active' && detail.status !== 'pending_approval' && (
              <Button onClick={() => setStatus('active')}>Aktif Et</Button>
            )}
            {detail.status !== 'suspended' && (
              <Button variant="secondary" onClick={() => setStatus('suspended')}>
                Pasif Et
              </Button>
            )}
            <button
              onClick={removeProvider}
              className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Sil
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
          <StatCard label="Verilen Teklif" value={detail.stats.offerCount} />
          <StatCard label="Kazanılan" value={detail.stats.wonCount} />
          <StatCard
            label="Kazanılan Gelir"
            value={
              detail.stats.wonTotal
                ? '₺' + detail.stats.wonTotal.toLocaleString('tr-TR')
                : '—'
            }
          />
          <StatCard
            label="Puan Ort."
            value={
              detail.stats.ratingCount
                ? detail.stats.ratingAvg.toFixed(1) +
                  ` (${detail.stats.ratingCount})`
                : '—'
            }
          />
          <StatCard label="Araç" value={detail.vehicles.length} />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-charcoal-200 overflow-x-auto">
        <TabButton active={tab === 'genel'} onClick={() => setTab('genel')}>
          Genel
        </TabButton>
        <TabButton
          active={tab === 'belgeler'}
          onClick={() => setTab('belgeler')}
        >
          Şirket Belgeleri ({docs.filter((d) => d.document).length}/{docs.length})
          {docs.some((d) => d.document?.status === 'pending') && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {docs.filter((d) => d.document?.status === 'pending').length}
            </span>
          )}
        </TabButton>
        <TabButton
          active={tab === 'arac_belgeler'}
          onClick={() => setTab('arac_belgeler')}
        >
          Araç Belgeleri
          {(() => {
            const pending = vehicleDocs.flatMap((g) =>
              g.documents.filter((d) => d.document?.status === 'pending'),
            ).length;
            return pending > 0 ? (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pending}
              </span>
            ) : null;
          })()}
        </TabButton>
        <TabButton
          active={tab === 'sofor_belgeler'}
          onClick={() => setTab('sofor_belgeler')}
        >
          Şoför Belgeleri
          {(() => {
            const pending = driverDocs.flatMap((g) =>
              g.documents.filter((d) => d.document?.status === 'pending'),
            ).length;
            return pending > 0 ? (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pending}
              </span>
            ) : null;
          })()}
        </TabButton>
        <TabButton
          active={tab === 'abonelikler'}
          onClick={() => setTab('abonelikler')}
        >
          Abonelikler ({detail.subscriptions.length})
        </TabButton>
        <TabButton active={tab === 'araclar'} onClick={() => setTab('araclar')}>
          Araçlar ({detail.vehicles.length})
        </TabButton>
        <TabButton active={tab === 'okullar'} onClick={() => setTab('okullar')}>
          Okullar & Bölgeler ({detail.schools.length + detail.regions.length})
        </TabButton>
        <TabButton
          active={tab === 'teklifler'}
          onClick={() => setTab('teklifler')}
        >
          Teklifler ({detail.offers.length})
        </TabButton>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {tab === 'belgeler' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-charcoal-100 bg-white p-4 text-sm text-charcoal-700">
            Zorunlu belgelerin tümü onaylanınca <b>Onay & SMS Gönder</b> butonuna
            basın. Bir belge reddedildiğinde servisçi giriş bilgileri de SMS ile
            gönderilir, ilgili belgeyi tekrar yükleyebilir.
          </div>
          {docs.map((row) => (
            <div
              key={row.definition.id}
              className={
                'card p-5 ' +
                (row.document?.status === 'approved'
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : row.document?.status === 'rejected'
                    ? 'border-red-200 bg-red-50/40'
                    : row.definition.required && !row.document
                      ? 'border-amber-300 bg-amber-50/40'
                      : '')
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-charcoal-900">
                    {row.definition.name}
                    {row.definition.required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </div>
                  {row.definition.description && (
                    <div className="mt-0.5 text-xs text-charcoal-500">
                      {row.definition.description}
                    </div>
                  )}
                  {row.document ? (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <a
                        href={row.document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-sunset-600 hover:text-sunset-700"
                      >
                        📎{' '}
                        {row.document.originalName ??
                          row.document.fileUrl.split('/').pop()}
                      </a>
                      <DocStatusBadge status={row.document.status} />
                    </div>
                  ) : (
                    <div className="mt-2 text-xs italic text-charcoal-500">
                      Yüklenmedi
                    </div>
                  )}
                  {row.document?.status === 'rejected' &&
                    row.document.rejectionReason && (
                      <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                        <b>Red gerekçesi:</b> {row.document.rejectionReason}
                      </div>
                    )}
                  {row.document?.expiresAt && (
                    <div className="mt-2 text-xs text-charcoal-600">
                      Bitiş:{' '}
                      {new Date(row.document.expiresAt).toLocaleDateString(
                        'tr-TR',
                      )}
                    </div>
                  )}
                </div>
                {row.document &&
                  row.document.status !== 'approved' && (
                    <div className="flex flex-none gap-2">
                      <Button onClick={() => approveDoc('company', row.document!.id)}>
                        Onayla
                      </Button>
                      <button
                        onClick={() => {
                          setRejectingDocId(row.document!.id);
                          setRejectDocKind('company');
                          setRejectReason('');
                        }}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Reddet
                      </button>
                    </div>
                  )}
                {row.document?.status === 'approved' && (
                  <button
                    onClick={() => {
                      setRejectingDocId(row.document!.id);
                      setRejectDocKind('company');
                      setRejectReason('');
                    }}
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Kararı Değiştir (Reddet)
                  </button>
                )}
              </div>
            </div>
          ))}
          {docs.length === 0 && (
            <div className="rounded-lg border border-dashed border-charcoal-200 p-12 text-center text-sm text-charcoal-500">
              Belge tanımı yok. Admin panelde Belge Tanımları'ndan ekleyin.
            </div>
          )}
        </div>
      )}

      {tab === 'arac_belgeler' && (
        <div className="space-y-6">
          {vehicleDocs.length === 0 && (
            <div className="rounded-lg border border-dashed border-charcoal-200 p-12 text-center text-sm text-charcoal-500">
              Servisçinin kayıtlı aracı yok.
            </div>
          )}
          {vehicleDocs.map((group) => (
            <div key={group.vehicle.id} className="card overflow-hidden">
              <div className="border-b border-charcoal-100 bg-sand-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-charcoal-900">
                      {group.vehicle.brand} {group.vehicle.model}{' '}
                      <span className="text-charcoal-500">
                        ({group.vehicle.year})
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-sm text-charcoal-500">
                      {group.vehicle.plate} · {group.vehicle.seats} kişilik
                    </div>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-charcoal-100">
                {group.documents.map((row) => (
                  <DocReviewRow
                    key={row.definition.id}
                    row={row}
                    onApprove={() =>
                      approveDoc('vehicle', row.document!.id)
                    }
                    onReject={() => {
                      setRejectingDocId(row.document!.id);
                      setRejectDocKind('vehicle');
                      setRejectReason('');
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'sofor_belgeler' && (
        <div className="space-y-6">
          {driverDocs.length === 0 && (
            <div className="rounded-lg border border-dashed border-charcoal-200 p-12 text-center text-sm text-charcoal-500">
              Servisçinin kayıtlı şoförü yok.
            </div>
          )}
          {driverDocs.map((group) => (
            <div key={group.driver.id} className="card overflow-hidden">
              <div className="border-b border-charcoal-100 bg-sand-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-charcoal-900">
                      {group.driver.name}
                      {!group.driver.active && (
                        <span className="ml-2 badge-neutral text-xs">
                          Pasif
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-sm text-charcoal-500">
                      {group.driver.phone}
                      {group.driver.licenseClass &&
                        ` · Ehliyet: ${group.driver.licenseClass}`}
                      {group.driver.tcNo && ` · TC: ${group.driver.tcNo}`}
                    </div>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-charcoal-100">
                {group.documents.map((row) => (
                  <DocReviewRow
                    key={row.definition.id}
                    row={row}
                    onApprove={() =>
                      approveDoc('driver', row.document!.id)
                    }
                    onReject={() => {
                      setRejectingDocId(row.document!.id);
                      setRejectDocKind('driver');
                      setRejectReason('');
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectingDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/50 p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-card-hover">
            <h3 className="text-lg font-bold text-charcoal-900">
              Belge Reddediliyor
            </h3>
            <p className="text-sm text-charcoal-600">
              Servisçiye red gerekçesini yazın. SMS ve panelde bu gerekçe
              gösterilecek.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Örn: Ruhsat okunmuyor, net bir fotoğraf yükleyin."
              className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectingDocId(null);
                  setRejectReason('');
                }}
              >
                Vazgeç
              </Button>
              <Button disabled={!rejectReason.trim()} onClick={rejectDoc}>
                Reddet
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'genel' && (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-charcoal-900">Firma Bilgileri</h2>
            {!edit ? (
              <Button variant="secondary" onClick={() => setEdit(true)}>
                Düzenle
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEdit(false)}>
                  İptal
                </Button>
                <Button onClick={save}>Kaydet</Button>
              </div>
            )}
          </div>
          {edit ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Firma Ünvanı"
                value={form.companyName}
                onChange={(v) => setForm({ ...form, companyName: v })}
              />
              <Field
                label="Vergi No"
                value={form.taxNo}
                onChange={(v) => setForm({ ...form, taxNo: v })}
              />
              <Field
                label="Yetkili"
                value={form.ownerName}
                onChange={(v) => setForm({ ...form, ownerName: v })}
              />
              <Field
                label="E-posta"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <div className="md:col-span-2">
                <Field
                  label="Adres"
                  value={form.address}
                  onChange={(v) => setForm({ ...form, address: v })}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <Info label="Firma Ünvanı" value={detail.companyName} />
              <Info label="Vergi No" value={detail.taxNo ?? '—'} />
              <Info label="Yetkili" value={detail.ownerName} />
              <Info label="Telefon" value={detail.phone} />
              <Info label="E-posta" value={detail.email ?? '—'} />
              <Info
                label="Kayıt Tarihi"
                value={new Date(detail.createdAt).toLocaleDateString('tr-TR')}
              />
              <div className="md:col-span-2">
                <Info label="Adres" value={detail.address ?? '—'} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'abonelikler' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
              <tr>
                <th className="px-6 py-3">Paket</th>
                <th className="px-6 py-3">Başlangıç</th>
                <th className="px-6 py-3">Bitiş</th>
                <th className="px-6 py-3">Durum</th>
                <th className="px-6 py-3">Dekont</th>
                <th className="px-6 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100">
              {detail.subscriptions.map((s) => {
                const active = s.approvedAt && s.endsAt && new Date(s.endsAt) > new Date();
                return (
                  <tr key={s.id} className="hover:bg-sand-50/50">
                    <td className="px-6 py-4">
                      <span className="badge-info">{s.packageCode}</span>
                    </td>
                    <td className="px-6 py-4 text-charcoal-700">
                      {s.startsAt
                        ? new Date(s.startsAt).toLocaleDateString('tr-TR')
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-charcoal-700">
                      {s.endsAt
                        ? new Date(s.endsAt).toLocaleDateString('tr-TR')
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {active ? (
                        <span className="badge-success">Aktif</span>
                      ) : s.approvedAt ? (
                        <span className="badge-neutral">Süresi Doldu</span>
                      ) : (
                        <span className="badge-warning">Onay Bekliyor</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {s.receiptUrl ? (
                        <a
                          href={s.receiptUrl}
                          target="_blank"
                          className="text-sunset-600 hover:text-sunset-700 underline"
                        >
                          İncele
                        </a>
                      ) : (
                        <span className="text-charcoal-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => extendSubscription(s.id)}
                          className="text-sm font-semibold text-sunset-600 hover:text-sunset-700"
                        >
                          Süre Uzat
                        </button>
                        <button
                          onClick={() => editEndsAt(s.id)}
                          className="text-sm font-semibold text-charcoal-600 hover:text-charcoal-900"
                        >
                          Tarih Değiştir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {detail.subscriptions.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-sm text-charcoal-500"
                  >
                    Abonelik yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'araclar' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
              <tr>
                <th className="px-6 py-3">Marka</th>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3">Yıl</th>
                <th className="px-6 py-3">Plaka</th>
                <th className="px-6 py-3">Koltuk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100">
              {detail.vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-sand-50/50">
                  <td className="px-6 py-4 font-semibold text-charcoal-900">
                    {v.brand}
                  </td>
                  <td className="px-6 py-4 text-charcoal-700">{v.model}</td>
                  <td className="px-6 py-4 text-charcoal-700">{v.year ?? '—'}</td>
                  <td className="px-6 py-4 font-mono text-charcoal-700">
                    {v.plate}
                  </td>
                  <td className="px-6 py-4 text-charcoal-700">{v.seats ?? '—'}</td>
                </tr>
              ))}
              {detail.vehicles.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-sm text-charcoal-500"
                  >
                    Kayıtlı araç yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'okullar' && (
        <SchoolsRegionsEditor
          providerId={id}
          currentSchools={detail.schools.map((s) => s.school)}
          currentRegions={detail.regions}
          onSaved={async () => {
            setNotice('Kayıt güncellendi.');
            setTimeout(() => setNotice(null), 2000);
            await load();
          }}
          onError={setError}
        />
      )}

      {tab === 'teklifler' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
              <tr>
                <th className="px-6 py-3">Tarih</th>
                <th className="px-6 py-3">Veli</th>
                <th className="px-6 py-3">Bölge</th>
                <th className="px-6 py-3">Fiyat</th>
                <th className="px-6 py-3">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100">
              {detail.offers.map((o) => (
                <tr key={o.id} className="hover:bg-sand-50/50">
                  <td className="px-6 py-4 text-charcoal-500">
                    {new Date(o.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 text-charcoal-700">
                    {o.request.parentName ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-charcoal-700">
                    {[o.request.city, o.request.district, o.request.neighborhood]
                      .filter(Boolean)
                      .join(' / ') || '—'}
                  </td>
                  <td className="px-6 py-4 font-semibold text-charcoal-900">
                    ₺{Number(o.monthlyPrice).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4">
                    {o.status === 'selected' ? (
                      <span className="badge-success">Seçildi</span>
                    ) : o.status === 'rejected' ? (
                      <span className="badge-neutral">Seçilmedi</span>
                    ) : (
                      <span className="badge-warning">Bekliyor</span>
                    )}
                  </td>
                </tr>
              ))}
              {detail.offers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-sm text-charcoal-500"
                  >
                    Henüz teklif yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'relative -mb-px flex flex-none items-center whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition ' +
        (active
          ? 'border-b-2 border-sunset-500 text-charcoal-900'
          : 'border-b-2 border-transparent text-charcoal-500 hover:text-charcoal-900')
      }
    >
      {children}
    </button>
  );
}

function DocReviewRow({
  row,
  onApprove,
  onReject,
}: {
  row: DocRow;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div
      className={
        'p-5 ' +
        (row.document?.status === 'approved'
          ? 'bg-emerald-50/40'
          : row.document?.status === 'rejected'
            ? 'bg-red-50/40'
            : row.definition.required && !row.document
              ? 'bg-amber-50/40'
              : '')
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-charcoal-900">
            {row.definition.name}
            {row.definition.required && (
              <span className="ml-1 text-red-500">*</span>
            )}
          </div>
          {row.document ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <a
                href={row.document.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-sunset-600 hover:text-sunset-700"
              >
                📎{' '}
                {row.document.originalName ??
                  row.document.fileUrl.split('/').pop()}
              </a>
              <DocStatusBadge status={row.document.status} />
              {row.document.expiresAt && (
                <span className="text-xs text-charcoal-500">
                  Bitiş:{' '}
                  {new Date(row.document.expiresAt).toLocaleDateString('tr-TR')}
                </span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-xs italic text-charcoal-500">
              Henüz yüklenmedi
            </div>
          )}
          {row.document?.status === 'rejected' &&
            row.document.rejectionReason && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                <b>Red gerekçesi:</b> {row.document.rejectionReason}
              </div>
            )}
        </div>
        {row.document && row.document.status !== 'approved' && (
          <div className="flex flex-none gap-2">
            <Button onClick={onApprove}>Onayla</Button>
            <button
              onClick={onReject}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Reddet
            </button>
          </div>
        )}
        {row.document?.status === 'approved' && (
          <button
            onClick={onReject}
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Kararı Değiştir (Reddet)
          </button>
        )}
      </div>
    </div>
  );
}

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: 'badge-warning', label: 'İnceleme Bekliyor' },
    approved: { cls: 'badge-success', label: 'Onaylı' },
    rejected: { cls: 'badge-neutral', label: 'Reddedildi' },
  };
  const m = map[status] ?? { cls: 'badge-neutral', label: status };
  const extra =
    status === 'rejected' ? { background: '#FEE2E2', color: '#991B1B' } : {};
  return (
    <span className={m.cls} style={extra}>
      {m.label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    active: { cls: 'badge-success', label: 'Aktif' },
    pending_approval: { cls: 'badge-warning', label: 'Onay Bekliyor' },
    pending_payment: { cls: 'badge-neutral', label: 'Ödeme Bekliyor' },
    suspended: { cls: 'badge-neutral', label: 'Pasif' },
  };
  const it = map[status] ?? { cls: 'badge-neutral', label: status };
  return <span className={it.cls}>{it.label}</span>;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
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
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
        {label}
      </div>
      <div className="mt-1 text-charcoal-900">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
      />
    </div>
  );
}

function SchoolsRegionsEditor({
  providerId,
  currentSchools,
  currentRegions,
  onSaved,
  onError,
}: {
  providerId: string;
  currentSchools: Array<{ id: string; name: string; city: string; district: string }>;
  currentRegions: Array<{ id: string; city: string; district: string }>;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [allSchools, setAllSchools] = useState<
    Array<{ id: string; name: string; city: string; district: string }>
  >([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>(
    currentSchools.map((s) => s.id),
  );
  const [regions, setRegions] = useState<
    Array<{ city: string; district: string }>
  >(
    currentRegions.length
      ? currentRegions.map((r) => ({ city: r.city, district: r.district }))
      : [{ city: '', district: '' }],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = adminSession.get();
    if (!token) return;
    apiGet<Array<{ id: string; name: string; city: string; district: string }>>(
      '/admin/schools',
      token,
    )
      .then(setAllSchools)
      .catch(() => {});
  }, []);

  async function saveSchools() {
    const token = adminSession.get();
    if (!token) return;
    setSaving(true);
    try {
      await apiPost(
        `/admin/providers/${providerId}/schools`,
        { schoolIds: selectedSchoolIds },
        token,
      );
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveRegions() {
    const token = adminSession.get();
    if (!token) return;
    const filtered = regions.filter((r) => r.city && r.district);
    setSaving(true);
    try {
      await apiPost(
        `/admin/providers/${providerId}/regions`,
        { regions: filtered },
        token,
      );
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-500">
            Okullar
          </h3>
          <Button onClick={saveSchools} disabled={saving}>
            Kaydet
          </Button>
        </div>
        <div className="max-h-96 space-y-1 overflow-y-auto rounded-lg border border-charcoal-100 bg-sand-50/50 p-3">
          {allSchools.map((s) => (
            <label
              key={s.id}
              className="flex items-start gap-2 rounded-md p-2 text-sm hover:bg-white"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selectedSchoolIds.includes(s.id)}
                onChange={(e) =>
                  setSelectedSchoolIds((prev) =>
                    e.target.checked
                      ? [...prev, s.id]
                      : prev.filter((x) => x !== s.id),
                  )
                }
              />
              <span>
                <div className="font-medium text-charcoal-900">{s.name}</div>
                <div className="text-xs text-charcoal-500">
                  {s.city}/{s.district}
                </div>
              </span>
            </label>
          ))}
          {allSchools.length === 0 && (
            <div className="p-3 text-sm text-charcoal-500">
              Okul kayıtlı değil.
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-charcoal-500">
          {selectedSchoolIds.length} okul seçili
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-500">
            Hizmet Bölgeleri
          </h3>
          <Button onClick={saveRegions} disabled={saving}>
            Kaydet
          </Button>
        </div>
        <div className="space-y-2">
          {regions.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                value={r.city}
                onChange={(e) =>
                  setRegions((prev) =>
                    prev.map((p, idx) =>
                      idx === i ? { ...p, city: e.target.value } : p,
                    ),
                  )
                }
                placeholder="İl"
                className="rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
              />
              <input
                value={r.district}
                onChange={(e) =>
                  setRegions((prev) =>
                    prev.map((p, idx) =>
                      idx === i ? { ...p, district: e.target.value } : p,
                    ),
                  )
                }
                placeholder="İlçe"
                className="rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
              />
              <button
                onClick={() =>
                  setRegions((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Sil
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setRegions((prev) => [...prev, { city: '', district: '' }])
            }
            className="text-sm font-semibold text-sunset-600 hover:text-sunset-700"
          >
            + Bölge Ekle
          </button>
        </div>
      </div>
    </div>
  );
}
