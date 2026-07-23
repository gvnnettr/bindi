'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { Button } from '@/components/ui';
import { formatPhone } from '@/components/Contact';
import { TakipGate } from '@/components/TakipGate';

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
  parent: { id: string; name: string; phone: string };
}

type Tab = 'submitted' | 'pending_late' | 'paid' | 'all';

export default function OdemelerPage() {
  return (
    <TakipGate>
      <OdemelerContent />
    </TakipGate>
  );
}

function OdemelerContent() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('submitted');

  async function load() {
    const token = providerSession.get();
    if (!token) return;
    try {
      const r = await apiGet<Payment[]>('/me/payments', token);
      setRows(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = useMemo(
    () =>
      rows.map((p) => {
        const due = new Date(p.dueDate);
        const isLate =
          (p.status === 'pending' || p.status === 'late') && due < today;
        return {
          ...p,
          effectiveStatus: isLate ? 'late' : p.status,
        };
      }),
    [rows, today],
  );

  const filtered = enriched.filter((p) => {
    if (tab === 'submitted') return p.effectiveStatus === 'submitted';
    if (tab === 'pending_late')
      return p.effectiveStatus === 'pending' || p.effectiveStatus === 'late';
    if (tab === 'paid') return p.effectiveStatus === 'paid';
    return true;
  });

  const totals = useMemo(() => {
    const submitted = enriched.filter((p) => p.effectiveStatus === 'submitted');
    const late = enriched.filter((p) => p.effectiveStatus === 'late');
    const paidThisMonth = enriched.filter((p) => {
      if (p.effectiveStatus !== 'paid' || !p.paidAt) return false;
      const d = new Date(p.paidAt);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    });
    return {
      submitted,
      late,
      paidThisMonth,
      paidThisMonthTotal: paidThisMonth.reduce((s, p) => s + p.amount, 0),
      lateTotal: late.reduce((s, p) => s + p.amount, 0),
    };
  }, [enriched, today]);

  async function markPaid(id: string) {
    if (!confirm('Bu ödemeyi TAHSIL EDİLDİ olarak işaretlemek istediğinize emin misiniz?'))
      return;
    const token = providerSession.get();
    if (!token) return;
    try {
      await apiPatch(`/me/payments/${id}/status`, { status: 'paid' }, token);
      setNotice('Ödeme tahsil edildi olarak işaretlendi.');
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function reject(id: string) {
    const note = prompt(
      'Ödeme neden reddediliyor? (Veli tekrar dekont yükleyecek)',
    );
    if (!note?.trim()) return;
    const token = providerSession.get();
    if (!token) return;
    try {
      await apiPatch(
        `/me/payments/${id}/status`,
        { status: 'pending', providerNote: note },
        token,
      );
      setNotice('Ödeme reddedildi, veli tekrar yükleyebilir.');
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

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

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Dekont Onay Bekliyor"
          value={totals.submitted.length}
          badge="Öncelik"
        />
        <Stat
          label="Gecikmiş"
          value={
            totals.late.length +
            ' · ₺' +
            totals.lateTotal.toLocaleString('tr-TR')
          }
        />
        <Stat
          label="Bu Ay Tahsilat"
          value={'₺' + totals.paidThisMonthTotal.toLocaleString('tr-TR')}
        />
      </div>

      <div className="flex items-center gap-2 border-b border-charcoal-200 overflow-x-auto">
        <TabBtn active={tab === 'submitted'} onClick={() => setTab('submitted')}>
          Dekont Bekliyor ({totals.submitted.length})
        </TabBtn>
        <TabBtn
          active={tab === 'pending_late'}
          onClick={() => setTab('pending_late')}
        >
          Ödenmemiş & Gecikmiş
        </TabBtn>
        <TabBtn active={tab === 'paid'} onClick={() => setTab('paid')}>
          Tahsil Edilen
        </TabBtn>
        <TabBtn active={tab === 'all'} onClick={() => setTab('all')}>
          Tümü
        </TabBtn>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
            <tr>
              <th className="px-6 py-3">Dönem</th>
              <th className="px-6 py-3">Öğrenci / Veli</th>
              <th className="px-6 py-3 text-right">Tutar</th>
              <th className="px-6 py-3">Son Ödeme</th>
              <th className="px-6 py-3">Dekont</th>
              <th className="px-6 py-3">Durum</th>
              <th className="px-6 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-sand-50/40">
                <td className="px-6 py-4 font-semibold text-charcoal-900">
                  {formatPeriod(p.period)}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-charcoal-900">
                    {p.student.name}
                  </div>
                  <div className="text-xs text-charcoal-500">
                    {p.parent.name} · {formatPhone(p.parent.phone)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-charcoal-900">
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
                  {p.parentNote && (
                    <div className="mt-1 text-[11px] italic text-charcoal-500">
                      "{p.parentNote}"
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <PaymentBadge status={p.effectiveStatus as any} />
                  {p.providerNote && (
                    <div className="mt-1 text-[11px] italic text-red-700">
                      Red: {p.providerNote}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {p.effectiveStatus === 'submitted' && (
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => markPaid(p.id)}
                        className="rounded-md bg-emerald-500 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                      >
                        Onayla
                      </button>
                      <button
                        onClick={() => reject(p.id)}
                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Reddet
                      </button>
                    </div>
                  )}
                  {p.effectiveStatus === 'pending' ||
                  p.effectiveStatus === 'late' ? (
                    <button
                      onClick={() => markPaid(p.id)}
                      className="rounded-md border border-charcoal-200 px-2 py-1 text-xs font-semibold text-charcoal-700 hover:bg-sand-50"
                    >
                      Elden Tahsil
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-sm text-charcoal-500">
                  Bu kategoride ödeme yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  badge,
}: {
  label: string;
  value: string | number;
  badge?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
          {label}
        </div>
        {badge && (
          <span className="badge-warning text-[10px]">{badge}</span>
        )}
      </div>
      <div className="mt-1 text-2xl font-black text-charcoal-900">{value}</div>
    </div>
  );
}

function TabBtn({
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
        'relative -mb-px whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition ' +
        (active
          ? 'border-b-2 border-sunset-500 text-charcoal-900'
          : 'border-b-2 border-transparent text-charcoal-500 hover:text-charcoal-900')
      }
    >
      {children}
    </button>
  );
}

function PaymentBadge({
  status,
}: {
  status: 'pending' | 'submitted' | 'paid' | 'late' | 'cancelled';
}) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: 'badge-warning', label: 'Bekliyor' },
    submitted: { cls: 'badge-info', label: 'Dekont Yüklendi' },
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
