'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button } from '@/components/ui';

interface Provider {
  id: string;
  phone: string;
  companyName: string;
  ownerName: string;
  status: string;
  createdAt: string;
  subscriptions: Array<{
    packageCode: string;
    receiptUrl: string | null;
    approvedAt: string | null;
  }>;
}

export default function AdminProvidersPage() {
  const [pending, setPending] = useState<Provider[]>([]);
  const [all, setAll] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  async function load() {
    const token = adminSession.get();
    if (!token) return;
    try {
      const [p, a] = await Promise.all([
        apiGet<Provider[]>('/admin/providers/pending', token),
        apiGet<Provider[]>('/admin/providers', token),
      ]);
      setPending(p);
      setAll(a);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    const months = Number(prompt('Kaç ay aktif olsun?', '12'));
    if (!months || months < 1) return;
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPost(`/admin/providers/${id}/approve`, { months }, token);
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

      <div className="flex items-center gap-2 border-b border-charcoal-200">
        <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
          Onay Bekleyenler
          {pending.length > 0 && (
            <span className="ml-2 rounded-full bg-sunset-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {pending.length}
            </span>
          )}
        </TabButton>
        <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
          Tümü ({all.length})
        </TabButton>
      </div>

      {tab === 'pending' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {pending.map((p) => (
            <div key={p.id} className="card p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-charcoal-900 text-white font-black">
                  {p.companyName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-charcoal-900">{p.companyName}</div>
                  <div className="text-sm text-charcoal-600">
                    {p.ownerName} — {p.phone}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {p.subscriptions.map((s, i) => (
                      <span key={i} className="badge-info">
                        {s.packageCode}
                      </span>
                    ))}
                    {p.subscriptions[0]?.receiptUrl ? (
                      <a
                        href={p.subscriptions[0].receiptUrl}
                        target="_blank"
                        className="text-sunset-600 hover:text-sunset-700 underline"
                      >
                        Dekont
                      </a>
                    ) : (
                      <span className="text-charcoal-400">Dekont yok</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={() => approve(p.id)}>
                  Onayla
                </Button>
                <Link
                  href={`/admin/servisciler/${p.id}`}
                  className="inline-flex items-center rounded-lg border border-charcoal-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal-900 transition hover:bg-sand-50"
                >
                  Detay
                </Link>
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-charcoal-200 bg-white p-12 text-center text-sm text-charcoal-500">
              🎉 Bekleyen başvuru yok, hepsi güncel.
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
              <tr>
                <th className="px-6 py-3">Firma</th>
                <th className="px-6 py-3">Yetkili</th>
                <th className="px-6 py-3">Telefon</th>
                <th className="px-6 py-3">Durum</th>
                <th className="px-6 py-3">Kayıt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100">
              {all.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => (window.location.href = `/admin/servisciler/${p.id}`)}
                  className="cursor-pointer hover:bg-sand-50/50"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-charcoal-900">{p.companyName}</div>
                  </td>
                  <td className="px-6 py-4 text-charcoal-700">{p.ownerName}</td>
                  <td className="px-6 py-4 text-charcoal-700">{p.phone}</td>
                  <td className="px-6 py-4">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-6 py-4 text-charcoal-500">
                    {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
              {all.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-charcoal-500">
                    Kayıtlı servisçi yok.
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
        'relative -mb-px flex items-center px-4 py-2.5 text-sm font-semibold transition ' +
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
    pending_approval: { cls: 'badge-warning', label: 'Onay Bekliyor' },
    pending_payment: { cls: 'badge-neutral', label: 'Ödeme Bekliyor' },
    suspended: { cls: 'badge-neutral', label: 'Askıda' },
  };
  const m = map[status] ?? { cls: 'badge-neutral', label: status };
  return <span className={m.cls}>{m.label}</span>;
}
