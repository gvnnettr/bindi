'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { Button } from '@/components/ui';

interface Detail {
  id: string;
  name: string;
  phone: string;
  tcNo: string | null;
  licenseClass: string | null;
  active: boolean;
  note: string | null;
  createdAt: string;
  documents: Array<{
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
    } | null;
  }>;
}

export default function DriverDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const driverId = params.id;
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    tcNo: '',
    licenseClass: '',
    note: '',
    active: true,
  });
  const [uploadingDef, setUploadingDef] = useState<string | null>(null);

  async function load() {
    const token = providerSession.get();
    if (!token) return;
    try {
      const r = await apiGet<Detail>(`/me/drivers/${driverId}`, token);
      setDetail(r);
      setForm({
        name: r.name,
        phone: r.phone,
        tcNo: r.tcNo ?? '',
        licenseClass: r.licenseClass ?? '',
        note: r.note ?? '',
        active: r.active,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, [driverId]);

  async function save() {
    const token = providerSession.get();
    if (!token) return;
    try {
      await apiPatch(
        `/me/drivers/${driverId}`,
        {
          name: form.name,
          phone: form.phone,
          tcNo: form.tcNo || null,
          licenseClass: form.licenseClass || null,
          note: form.note || null,
          active: form.active,
        },
        token,
      );
      setEditing(false);
      setNotice('Bilgiler güncellendi.');
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function uploadDoc(
    defId: string,
    file: File,
    issuedAt: string,
    expiresAt: string,
  ) {
    const token = providerSession.get();
    if (!token) return;
    setUploadingDef(defId);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('definitionId', defId);
      if (issuedAt) fd.append('issuedAt', issuedAt);
      if (expiresAt) fd.append('expiresAt', expiresAt);
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(
        `${base}/api/me/drivers/${driverId}/documents`,
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

  if (!detail) {
    return (
      <div className="text-charcoal-500">
        {error ? <span className="text-red-600">{error}</span> : 'Yükleniyor…'}
      </div>
    );
  }

  const requiredDocs = detail.documents.filter((d) => d.definition.required);
  const approved = requiredDocs.filter(
    (d) => d.document?.status === 'approved',
  ).length;

  return (
    <div className="space-y-6">
      <div className="text-sm">
        <Link
          href="/servisci/soforler"
          className="text-charcoal-500 hover:text-charcoal-900"
        >
          ← Şoförler
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

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-charcoal-900">
              {detail.name}
            </h1>
            <div className="mt-1 text-sm text-charcoal-500">
              {detail.phone}
              {detail.licenseClass && ` · Ehliyet: ${detail.licenseClass}`}
              {detail.tcNo && ` · TC: ${detail.tcNo}`}
            </div>
            {!detail.active && (
              <span className="mt-2 inline-block badge-neutral">Pasif</span>
            )}
          </div>
          {!editing ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Düzenle
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(false)}>
                İptal
              </Button>
              <Button onClick={save}>Kaydet</Button>
            </div>
          )}
        </div>

        {editing && (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Field label="Ad Soyad">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Telefon">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="TC Kimlik No">
              <input
                value={form.tcNo}
                onChange={(e) => setForm({ ...form, tcNo: e.target.value })}
                maxLength={11}
                className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Ehliyet Sınıfı">
              <input
                value={form.licenseClass}
                onChange={(e) =>
                  setForm({ ...form, licenseClass: e.target.value })
                }
                className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Not">
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.checked })
                }
              />
              Aktif şoför
            </label>
          </div>
        )}

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
        {detail.documents.map((row) => (
          <DocumentCard
            key={row.definition.id}
            row={row}
            onUpload={(f, i, e) => uploadDoc(row.definition.id, f, i, e)}
            uploading={uploadingDef === row.definition.id}
          />
        ))}
      </div>
    </div>
  );
}

function DocumentCard({
  row,
  onUpload,
  uploading,
}: {
  row: Detail['documents'][number];
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
            <div className="mt-2 flex items-center gap-3">
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500">
        {label}
      </label>
      {children}
    </div>
  );
}
