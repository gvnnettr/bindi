'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { Button } from '@/components/ui';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  seats: number;
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
    createdAt: string;
    daysToExpiry: number | null;
    expiryStatus: 'ok' | 'soon' | 'expired' | 'na';
  } | null;
}

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isNew = searchParams.get('newVehicle') === '1';
  const vehicleId = params.id;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadingDef, setUploadingDef] = useState<string | null>(null);

  async function load() {
    const token = providerSession.get();
    if (!token) return;
    try {
      const [vs, ds] = await Promise.all([
        apiGet<Vehicle[]>('/me/vehicles', token),
        apiGet<DocRow[]>(`/me/vehicles/${vehicleId}/documents`, token),
      ]);
      setVehicle(vs.find((v) => v.id === vehicleId) ?? null);
      setDocs(ds);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, [vehicleId]);

  async function uploadDoc(
    definitionId: string,
    file: File,
    issuedAt: string,
    expiresAt: string,
  ) {
    const token = providerSession.get();
    if (!token) return;
    setUploadingDef(definitionId);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('definitionId', definitionId);
      if (issuedAt) fd.append('issuedAt', issuedAt);
      if (expiresAt) fd.append('expiresAt', expiresAt);
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(
        `${base}/api/me/vehicles/${vehicleId}/documents`,
        {
          method: 'POST',
          body: fd,
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(JSON.parse(t)?.message ?? `HTTP ${res.status}`);
      }
      setNotice('Belge yüklendi, admin incelemesine sunuldu.');
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setError('Yükleme başarısız: ' + (e as Error).message);
    } finally {
      setUploadingDef(null);
    }
  }

  if (!vehicle) {
    return (
      <div className="text-charcoal-500">
        {error ? <span className="text-red-600">{error}</span> : 'Yükleniyor…'}
      </div>
    );
  }

  const requiredDocs = docs.filter((d) => d.definition.required);
  const approved = requiredDocs.filter(
    (d) => d.document?.status === 'approved',
  ).length;

  return (
    <div className="space-y-6">
      <div className="text-sm">
        <Link
          href="/servisci/araclar"
          className="text-charcoal-500 hover:text-charcoal-900"
        >
          ← Araçlar
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {isNew && (
        <div className="rounded-xl border-2 border-sunset-300 bg-sunset-50 p-5">
          <div className="flex items-start gap-3">
            <div className="text-2xl">✓</div>
            <div>
              <div className="text-sm font-bold text-sunset-800">
                Aracınız eklendi. Sıradaki adım: belgeleri yükleyin.
              </div>
              <p className="mt-1 text-sm text-sunset-700">
                Ruhsat, muayene, sigorta ve diğer zorunlu belgelerinizi aşağıdan
                yükleyin. Belgeler admin incelemesi sonrası aktifleşir.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-charcoal-900">
              {vehicle.brand} {vehicle.model}
            </h1>
            <div className="mt-1 text-sm text-charcoal-500">
              Model yılı: {vehicle.year} · Plaka: <b>{vehicle.plate}</b> ·{' '}
              {vehicle.seats} kişilik
            </div>
          </div>
          <div className="flex-none text-4xl">🚐</div>
        </div>

        <div className="mt-4 flex items-baseline gap-3">
          <div className="text-3xl font-black text-charcoal-900">
            {approved}/{requiredDocs.length}
          </div>
          <div className="text-sm text-charcoal-500">zorunlu belge onaylı</div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-charcoal-100">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{
              width:
                (requiredDocs.length ? approved / requiredDocs.length : 0) *
                  100 +
                '%',
            }}
          />
        </div>
      </div>

      <h2 className="text-lg font-bold text-charcoal-900">Belgeler</h2>
      <div className="space-y-3">
        {docs.map((row) => (
          <DocumentCard
            key={row.definition.id}
            row={row}
            onUpload={(f, i, e) => uploadDoc(row.definition.id, f, i, e)}
            uploading={uploadingDef === row.definition.id}
          />
        ))}
        {docs.length === 0 && (
          <div className="rounded-lg border border-dashed border-charcoal-200 p-12 text-center text-sm text-charcoal-500">
            Admin panelde araç belgesi tanımı yok.
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentCard({
  row,
  onUpload,
  uploading,
}: {
  row: DocRow;
  onUpload: (f: File, issuedAt: string, expiresAt: string) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [issuedAt, setIssuedAt] = useState(
    row.document?.issuedAt
      ? new Date(row.document.issuedAt).toISOString().slice(0, 10)
      : '',
  );
  const [expiresAt, setExpiresAt] = useState(
    row.document?.expiresAt
      ? new Date(row.document.expiresAt).toISOString().slice(0, 10)
      : '',
  );

  const cls =
    row.document?.status === 'approved'
      ? 'border-emerald-200 bg-emerald-50/40'
      : row.document?.status === 'rejected'
        ? 'border-red-200 bg-red-50/40'
        : row.definition.required && !row.document
          ? 'border-amber-300 bg-amber-50/40'
          : 'border-charcoal-100 bg-white';

  return (
    <div className={`card p-5 ${cls}`}>
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
          {row.document && (
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
              <StatusBadge status={row.document.status} />
              {row.document.expiresAt && (
                <span className="text-xs text-charcoal-500">
                  Bitiş:{' '}
                  {new Date(row.document.expiresAt).toLocaleDateString('tr-TR')}
                  {row.document.expiryStatus === 'soon' && (
                    <span className="ml-1 text-amber-700">
                      ({row.document.daysToExpiry} gün kaldı)
                    </span>
                  )}
                  {row.document.expiryStatus === 'expired' && (
                    <span className="ml-1 text-red-600">(süresi geçti)</span>
                  )}
                </span>
              )}
            </div>
          )}
          {row.document?.status === 'rejected' &&
            row.document.rejectionReason && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                <b>Red gerekçesi:</b> {row.document.rejectionReason}
              </div>
            )}
        </div>
      </div>

      {row.document?.status !== 'approved' && (
        <div className="mt-4 border-t border-charcoal-100 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
            {row.document ? 'Tekrar Yükle' : 'Yükle'}
          </div>
          {row.definition.requiresExpiry && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label>
                <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">
                  Veriliş
                </div>
                <input
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                  className="w-full rounded-md border border-charcoal-200 bg-white px-2 py-1 text-xs"
                />
              </label>
              <label>
                <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">
                  Bitiş
                </div>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-md border border-charcoal-200 bg-white px-2 py-1 text-xs"
                />
              </label>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f, issuedAt, expiresAt);
              e.target.value = '';
            }}
          />
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Yükleniyor…' : row.document ? 'Yeni Dosya' : 'Dosya Seç'}
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: 'badge-warning', label: 'İnceleme Bekliyor' },
    approved: { cls: 'badge-success', label: 'Onaylı' },
    rejected: { cls: 'badge-neutral', label: 'Reddedildi' },
  };
  const m = map[status] ?? { cls: 'badge-neutral', label: status };
  return <span className={m.cls}>{m.label}</span>;
}
