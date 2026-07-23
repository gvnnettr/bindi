'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { Button } from '@/components/ui';
import { formatPhone } from '@/components/Contact';
import { TakipGate } from '@/components/TakipGate';

interface Detail {
  id: string;
  status: string;
  startMonth: string;
  endMonth: string | null;
  monthlyPrice: number;
  note: string | null;
  createdAt: string;
  student: {
    id: string;
    name: string;
    class: string | null;
    school: { id: string; name: string; city: string; district: string } | null;
  };
  parent: { id: string; name: string; phone: string; email: string | null };
  vehicle: {
    id: string;
    brand: string;
    model: string;
    plate: string;
    seats: number;
  } | null;
  payments: Array<{
    id: string;
    period: string;
    amount: number;
    dueDate: string;
    status: 'pending' | 'submitted' | 'paid' | 'late' | 'cancelled';
    receiptUrl: string | null;
    parentNote: string | null;
    providerNote: string | null;
    submittedAt: string | null;
    paidAt: string | null;
  }>;
}

export default function EnrollmentDetailPage() {
  return (
    <TakipGate>
      <EnrollmentDetailContent />
    </TakipGate>
  );
}

function EnrollmentDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState('');

  async function load() {
    const token = providerSession.get();
    if (!token) return;
    try {
      const detail = await apiGet<Detail>(`/me/enrollments/${id}`, token);
      setD(detail);
      setNote(detail.note ?? '');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function saveNote() {
    const token = providerSession.get();
    if (!token) return;
    try {
      await apiPatch(`/me/enrollments/${id}`, { note }, token);
      setEditingNote(false);
      setNotice('Not güncellendi.');
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function endEnrollment() {
    if (
      !confirm(
        'Bu öğrencinin servis kaydını sonlandırmak istediğinize emin misiniz?',
      )
    )
      return;
    const token = providerSession.get();
    if (!token) return;
    try {
      await apiPost(`/me/enrollments/${id}/end`, {}, token);
      router.push('/servisci/ogrencilerim');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!d) {
    return (
      <div className="text-charcoal-500">
        {error ? <span className="text-red-600">{error}</span> : 'Yükleniyor…'}
      </div>
    );
  }

  const paid = d.payments.filter((p) => p.status === 'paid');
  const pending = d.payments.filter((p) => p.status === 'pending' || p.status === 'submitted');
  const late = d.payments.filter((p) => p.status === 'late');
  const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="text-sm">
        <Link
          href="/servisci/ogrencilerim"
          className="text-charcoal-500 hover:text-charcoal-900"
        >
          ← Öğrencilerim
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-charcoal-900">
              {d.student.name}
            </h1>
            <div className="mt-1 text-sm text-charcoal-500">
              {d.student.class && `${d.student.class} · `}
              {d.student.school?.name}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StatusPill status={d.status} />
              <div className="flex items-center gap-2 text-xs text-charcoal-500">
                <span>Başlangıç:</span>
                <StartMonthEditor
                  value={d.startMonth}
                  status={d.status}
                  onSave={async (newStart) => {
                    const token = providerSession.get();
                    if (!token) return;
                    try {
                      await apiPatch(`/me/enrollments/${id}`, { startMonth: newStart }, token);
                      setNotice('Başlangıç ayı güncellendi ve ödemeler yeniden hesaplandı.');
                      setTimeout(() => setNotice(null), 3500);
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                />
                {d.endMonth && <span>· Bitiş: {d.endMonth}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
              Aylık Ücret
            </div>
            <div className="text-3xl font-black text-charcoal-900">
              ₺{d.monthlyPrice.toLocaleString('tr-TR')}
            </div>
            {d.status !== 'ended' && (
              <button
                onClick={endEnrollment}
                className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Kaydı Sonlandır
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 text-sm md:grid-cols-4">
          <Stat label="Tahsil Edilen" value={'₺' + totalPaid.toLocaleString('tr-TR')} />
          <Stat label="Bekleyen" value={'₺' + totalPending.toLocaleString('tr-TR')} />
          <Stat label="Gecikmiş" value={late.length} />
          <Stat label="Toplam Ay" value={d.payments.length} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-charcoal-500">
            Veli
          </h3>
          <div className="text-lg font-bold text-charcoal-900">
            {d.parent.name}
          </div>
          <div className="mt-1 text-sm text-charcoal-600">
            {formatPhone(d.parent.phone)}
          </div>
          {d.parent.email && (
            <div className="text-xs text-charcoal-500">{d.parent.email}</div>
          )}
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
            Araç
          </h3>
          {d.vehicle ? (
            <>
              <div className="text-lg font-bold text-charcoal-900">
                {d.vehicle.brand} {d.vehicle.model}
              </div>
              <div className="mt-1 text-sm text-charcoal-600">
                <span className="font-mono">{d.vehicle.plate}</span> ·{' '}
                {d.vehicle.seats} kişilik
              </div>
              <Link
                href={`/servisci/araclar/${d.vehicle.id}`}
                className="mt-3 inline-block text-xs font-semibold text-sunset-600 hover:text-sunset-700"
              >
                Araç detayı →
              </Link>
            </>
          ) : (
            <div className="text-sm text-charcoal-500">Araç atanmadı.</div>
          )}
        </div>

        <div className="card p-6 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-500">
              Notlar
            </h3>
            {!editingNote && (
              <button
                onClick={() => setEditingNote(true)}
                className="text-xs font-semibold text-sunset-600 hover:text-sunset-700"
              >
                Düzenle
              </button>
            )}
          </div>
          {editingNote ? (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
                placeholder="Öğrenci veya veli hakkında notlar…"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingNote(false);
                    setNote(d.note ?? '');
                  }}
                  className="text-xs font-semibold text-charcoal-500 hover:text-charcoal-900"
                >
                  Vazgeç
                </button>
                <Button onClick={saveNote}>Kaydet</Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-line text-sm text-charcoal-700">
              {d.note || (
                <span className="italic text-charcoal-400">Not eklenmedi.</span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-charcoal-100 bg-sand-50 px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-500">
            Aylık Ödemeler ({d.payments.length})
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-charcoal-100 bg-white text-left text-xs uppercase tracking-wider text-charcoal-500">
            <tr>
              <th className="px-6 py-3">Dönem</th>
              <th className="px-6 py-3 text-right">Tutar</th>
              <th className="px-6 py-3">Son Ödeme</th>
              <th className="px-6 py-3">Dekont</th>
              <th className="px-6 py-3">Durum</th>
              <th className="px-6 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {d.payments.map((p) => (
              <tr key={p.id} className="hover:bg-sand-50/40">
                <td className="px-6 py-4 font-semibold text-charcoal-900">
                  {formatPeriod(p.period)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-charcoal-900">
                  ₺{p.amount.toLocaleString('tr-TR')}
                </td>
                <td className="px-6 py-4 text-xs text-charcoal-600">
                  {formatDate(p.dueDate)}
                </td>
                <td className="px-6 py-4">
                  {p.receiptUrl ? (
                    <a
                      href={p.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-sunset-600 hover:text-sunset-700"
                    >
                      İncele
                    </a>
                  ) : (
                    <span className="text-xs text-charcoal-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <PaymentBadge status={p.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/servisci/odemeler/${p.id}`}
                    className="text-xs font-semibold text-charcoal-600 hover:text-charcoal-900"
                  >
                    Aç
                  </Link>
                </td>
              </tr>
            ))}
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    active: { cls: 'badge-success', label: 'Aktif' },
    paused: { cls: 'badge-warning', label: 'Duraklatıldı' },
    ended: { cls: 'badge-neutral', label: 'Sonlandı' },
  };
  const m = map[status] ?? { cls: 'badge-neutral', label: status };
  return <span className={m.cls}>{m.label}</span>;
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: 'badge-warning', label: 'Bekliyor' },
    submitted: { cls: 'badge-info', label: 'Dekont Yüklendi' },
    paid: { cls: 'badge-success', label: 'Ödendi' },
    late: { cls: 'badge-neutral', label: 'Gecikmiş' },
    cancelled: { cls: 'badge-neutral', label: 'İptal' },
  };
  const m = map[status] ?? { cls: 'badge-neutral', label: status };
  return <span className={m.cls}>{m.label}</span>;
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

function StartMonthEditor({
  value,
  status,
  onSave,
}: {
  value: string;
  status: string;
  onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [next, setNext] = useState(value);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (status === 'ended') {
    return <span className="font-mono font-semibold text-charcoal-700">{formatPeriod(value)}</span>;
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="font-mono font-semibold text-charcoal-700">{formatPeriod(value)}</span>
        <button
          type="button"
          onClick={() => { setNext(value); setEditing(true); }}
          className="text-[10px] font-semibold text-sunset-600 hover:text-sunset-700"
        >
          Değiştir
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        type="month"
        value={next}
        min={currentPeriod}
        onChange={(e) => setNext(e.target.value)}
        className="rounded border border-charcoal-200 bg-white px-2 py-0.5 text-xs"
      />
      <button
        type="button"
        disabled={saving || next === value || next < currentPeriod}
        onClick={async () => {
          if (!confirm('Başlangıç ayını değiştirmek, henüz ödenmemiş ödemeleri silip yeniden oluşturur. Devam?')) return;
          setSaving(true);
          try { await onSave(next); setEditing(false); } finally { setSaving(false); }
        }}
        className="rounded bg-sunset-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-sunset-600 disabled:opacity-50"
      >
        {saving ? '…' : 'Kaydet'}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-[10px] font-semibold text-charcoal-500 hover:text-charcoal-700"
      >
        Vazgeç
      </button>
    </span>
  );
}
