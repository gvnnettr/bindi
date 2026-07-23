'use client';

import { useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { Button } from '@/components/ui';

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
  } | null;
}

export default function BelgelerimPage() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadingDef, setUploadingDef] = useState<string | null>(null);

  async function load() {
    const token = providerSession.get();
    if (!token) return;
    try {
      const r = await apiGet<DocRow[]>('/me/documents', token);
      setRows(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
      const res = await fetch(`${base}/api/me/documents`, {
        method: 'POST',
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(JSON.parse(t)?.message ?? `HTTP ${res.status}`);
      }
      setNotice('Belge yüklendi, admin incelemesine sunuldu.');
      setTimeout(() => setNotice(null), 3000);
      await load();
    } catch (e) {
      setError('Yükleme başarısız: ' + (e as Error).message);
    } finally {
      setUploadingDef(null);
    }
  }

  const required = rows.filter((r) => r.definition.required);
  const approvedCount = required.filter(
    (r) => r.document?.status === 'approved',
  ).length;
  const rejectedRows = rows.filter((r) => r.document?.status === 'rejected');

  return (
    <div className="space-y-6">
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

      {rejectedRows.length > 0 && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5">
          <div className="text-sm font-bold text-red-900">
            ⚠️ Reddedilen belgeler var — tekrar yüklemeniz gerekiyor
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm text-red-800">
            {rejectedRows.map((r) => (
              <li key={r.definition.id}>
                <b>{r.definition.name}</b>
                {r.document?.rejectionReason && (
                  <span> — {r.document.rejectionReason}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
          Zorunlu Belge Durumu
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <div className="text-3xl font-black text-charcoal-900">
            {approvedCount}/{required.length}
          </div>
          <div className="text-sm text-charcoal-500">onaylı belge</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-charcoal-100">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{
              width:
                (required.length ? approvedCount / required.length : 0) * 100 +
                '%',
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <DocumentCard
            key={row.definition.id}
            row={row}
            onUpload={(f, issuedAt, expiresAt) =>
              uploadDoc(row.definition.id, f, issuedAt, expiresAt)
            }
            uploading={uploadingDef === row.definition.id}
          />
        ))}
        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-charcoal-200 p-12 text-center text-sm text-charcoal-500">
            Belge tanımı yükleniyor…
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

  const statusColor =
    row.document?.status === 'approved'
      ? 'border-emerald-200 bg-emerald-50/40'
      : row.document?.status === 'rejected'
        ? 'border-red-200 bg-red-50/40'
        : row.definition.required && !row.document
          ? 'border-amber-300 bg-amber-50/40'
          : 'border-charcoal-100 bg-white';

  return (
    <div className={`card p-5 ${statusColor}`}>
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

      {(row.document?.status !== 'approved' || !row.document) && (
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
            {uploading ? 'Yükleniyor…' : row.document ? 'Yeni Dosya Seç' : 'Dosya Seç'}
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
