'use client';

import { useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import { parentSession } from '@/lib/session';
import { Button } from '@/components/ui';
import { formatPhone } from '@/components/Contact';

interface Payment {
  id: string;
  enrollmentId: string;
  period: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'submitted' | 'paid' | 'late' | 'cancelled';
  receiptUrl: string | null;
  parentNote: string | null;
  providerNote: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  student: { id: string; name: string };
  provider: { id: string; companyName: string; phone: string };
}

export default function VeliOdemelerPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  async function load() {
    const token = parentSession.get();
    if (!token) return;
    try {
      const r = await apiGet<Payment[]>('/parent/payments', token);
      setRows(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadReceipt(paymentId: string, file: File, note: string) {
    const token = parentSession.get();
    if (!token) return;
    setUploadingId(paymentId);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (note) fd.append('parentNote', note);
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${base}/api/parent/payments/${paymentId}/receipt`, {
        method: 'POST',
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(JSON.parse(t)?.message ?? `HTTP ${res.status}`);
      }
      setNotice('Dekont yüklendi, servisçi onayı bekleniyor.');
      setTimeout(() => setNotice(null), 3000);
      await load();
    } catch (e) {
      setError('Yükleme başarısız: ' + (e as Error).message);
    } finally {
      setUploadingId(null);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const enriched = rows.map((p) => {
    const due = new Date(p.dueDate);
    const isLate = p.status === 'pending' && due < today;
    return { ...p, effectiveStatus: isLate ? 'late' : p.status };
  });

  const grouped = enriched.reduce((acc, p) => {
    const key = p.student.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, typeof enriched>);

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

      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-charcoal-200 bg-white p-12 text-center text-sm text-charcoal-500">
          Henüz ödeme kaydı yok. Bir servisçi seçtikten sonra aylık ödeme planınız
          otomatik oluşur.
        </div>
      )}

      {Object.entries(grouped).map(([studentName, payments]) => {
        const provider = payments[0]?.provider;
        return (
          <div key={studentName} className="card overflow-hidden">
            <div className="border-b border-charcoal-100 bg-sand-50 px-6 py-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                {provider?.companyName}
              </div>
              <h2 className="mt-1 text-lg font-bold text-charcoal-900">
                {studentName}
              </h2>
            </div>
            <div className="divide-y divide-charcoal-100">
              {payments.map((p) => (
                <PaymentRow
                  key={p.id}
                  p={p}
                  uploading={uploadingId === p.id}
                  onUpload={(file, note) => uploadReceipt(p.id, file, note)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentRow({
  p,
  uploading,
  onUpload,
}: {
  p: Payment & { effectiveStatus: string };
  uploading: boolean;
  onUpload: (file: File, note: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const canUpload =
    p.effectiveStatus === 'pending' || p.effectiveStatus === 'late';

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-charcoal-900">
            {formatPeriod(p.period)}
          </div>
          <div className="mt-0.5 text-xs text-charcoal-500">
            Son ödeme: {formatDate(p.dueDate)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-charcoal-900">
            ₺{p.amount.toLocaleString('tr-TR')}
          </div>
          <div className="mt-1">
            <PaymentBadge status={p.effectiveStatus as any} />
          </div>
        </div>
      </div>

      {p.receiptUrl && (
        <div className="mt-3 rounded-md border border-charcoal-100 bg-sand-50/50 p-3 text-xs">
          <a
            href={p.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-sunset-600 hover:text-sunset-700"
          >
            📎 Yüklediğiniz dekont
          </a>
          {p.submittedAt && (
            <div className="mt-1 text-charcoal-500">
              Yüklendi: {new Date(p.submittedAt).toLocaleString('tr-TR')}
            </div>
          )}
        </div>
      )}

      {p.providerNote && p.effectiveStatus !== 'paid' && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <b>Servisçi red açıklaması:</b> {p.providerNote}
        </div>
      )}

      {canUpload && (
        <div className="mt-4 border-t border-charcoal-100 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
            {p.receiptUrl ? 'Tekrar Yükle' : 'Dekont Yükle'}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Notunuz (opsiyonel)"
            className="mt-2 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-xs"
          />
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f, note);
              e.target.value = '';
            }}
          />
          <Button
            className="mt-2"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Yükleniyor…' : 'Dosya Seç (PDF/PNG/JPG)'}
          </Button>
        </div>
      )}
    </div>
  );
}

function PaymentBadge({
  status,
}: {
  status: 'pending' | 'submitted' | 'paid' | 'late' | 'cancelled';
}) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: 'badge-warning', label: 'Bekliyor' },
    submitted: { cls: 'badge-info', label: 'İnceleme Bekliyor' },
    paid: { cls: 'badge-success', label: 'Ödendi' },
    late: { cls: 'badge-neutral', label: 'Gecikmiş' },
    cancelled: { cls: 'badge-neutral', label: 'İptal' },
  };
  const m = map[status] ?? { cls: 'badge-neutral', label: status };
  const extra =
    status === 'late' ? { background: '#FEE2E2', color: '#991B1B' } : {};
  return (
    <span className={m.cls} style={extra}>
      {m.label}
    </span>
  );
}

function formatPeriod(p: string) {
  const [y, m] = p.split('-');
  const names = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ];
  return `${names[Number(m) - 1]} ${y}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR');
}
