'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { formatPhone } from '@/components/Contact';
import { TakipGate } from '@/components/TakipGate';

interface Enrollment {
  id: string;
  status: 'active' | 'paused' | 'ended';
  startMonth: string;
  endMonth: string | null;
  monthlyPrice: number;
  createdAt: string;
  student: {
    id: string;
    name: string;
    class: string | null;
    school: { id: string; name: string; city: string; district: string } | null;
  };
  parent: { id: string; name: string; phone: string };
  vehicle: { id: string; brand: string; model: string; plate: string } | null;
}

type Tab = 'active' | 'ended';

export default function OgrencilerimPage() {
  return (
    <TakipGate>
      <OgrencilerimContent />
    </TakipGate>
  );
}

function OgrencilerimContent() {
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('active');

  useEffect(() => {
    const token = providerSession.get();
    if (!token) return;
    apiGet<Enrollment[]>('/me/enrollments', token)
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, []);

  const filtered = rows.filter((r) =>
    tab === 'active' ? r.status !== 'ended' : r.status === 'ended',
  );
  const activeCount = rows.filter((r) => r.status !== 'ended').length;
  const endedCount = rows.filter((r) => r.status === 'ended').length;
  const totalMonthly = rows
    .filter((r) => r.status === 'active')
    .reduce((s, r) => s + r.monthlyPrice, 0);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Aktif Öğrenci" value={activeCount} />
        <Stat
          label="Aylık Gelir"
          value={'₺' + totalMonthly.toLocaleString('tr-TR')}
        />
        <Stat label="Toplam Kayıt" value={rows.length} />
      </div>

      <div className="flex items-center gap-2 border-b border-charcoal-200">
        <TabBtn active={tab === 'active'} onClick={() => setTab('active')}>
          Aktif ({activeCount})
        </TabBtn>
        <TabBtn active={tab === 'ended'} onClick={() => setTab('ended')}>
          Sonlanan ({endedCount})
        </TabBtn>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
            <tr>
              <th className="px-6 py-3">Öğrenci</th>
              <th className="px-6 py-3">Okul</th>
              <th className="px-6 py-3">Veli</th>
              <th className="px-6 py-3">Araç</th>
              <th className="px-6 py-3">Başlangıç</th>
              <th className="px-6 py-3 text-right">Aylık</th>
              <th className="px-6 py-3">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => (window.location.href = `/servisci/ogrencilerim/${r.id}`)}
                className="cursor-pointer hover:bg-sand-50/50"
              >
                <td className="px-6 py-4">
                  <div className="font-semibold text-charcoal-900">
                    {r.student.name}
                  </div>
                  {r.student.class && (
                    <div className="text-xs text-charcoal-500">
                      Sınıf: {r.student.class}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-charcoal-700">
                  {r.student.school ? (
                    <div>
                      <div className="text-sm">{r.student.school.name}</div>
                      <div className="text-xs text-charcoal-500">
                        {r.student.school.district}/{r.student.school.city}
                      </div>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">{r.parent.name}</div>
                  <div className="text-xs text-charcoal-500">
                    {formatPhone(r.parent.phone)}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-charcoal-700">
                  {r.vehicle ? (
                    <>
                      <div>
                        {r.vehicle.brand} {r.vehicle.model}
                      </div>
                      <div className="font-mono text-charcoal-500">
                        {r.vehicle.plate}
                      </div>
                    </>
                  ) : (
                    <span className="text-charcoal-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-charcoal-600">
                  {r.startMonth}
                  {r.endMonth && (
                    <div className="text-charcoal-400">→ {r.endMonth}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-base font-bold text-charcoal-900">
                    ₺{r.monthlyPrice.toLocaleString('tr-TR')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-sm text-charcoal-500">
                  {tab === 'active'
                    ? 'Aktif öğrenci yok. Teklif kabul edildiğinde otomatik eklenir.'
                    : 'Sonlanan öğrenci yok.'}
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
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
        {label}
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
        'relative -mb-px px-4 py-2.5 text-sm font-semibold transition ' +
        (active
          ? 'border-b-2 border-sunset-500 text-charcoal-900'
          : 'border-b-2 border-transparent text-charcoal-500 hover:text-charcoal-900')
      }
    >
      {children}
    </button>
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
