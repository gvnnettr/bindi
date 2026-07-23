'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { formatPhone } from '@/components/Contact';

interface Req {
  id: string;
  city: string;
  district: string;
  neighborhood: string;
  status: string;
  createdAt: string;
  parent: { name: string; phone: string };
  offerCount: number;
  selectedOffer: {
    id: string;
    monthlyPrice: string;
    selectedAt: string;
    provider: {
      id: string;
      companyName: string;
      ownerName: string;
      phone: string;
    };
  } | null;
}

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<Req[]>([]);
  const router = useRouter();
  useEffect(() => {
    const token = adminSession.get();
    if (!token) return;
    apiGet<Req[]>('/admin/requests', token).then(setRows).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
            Son 100 kayıt
          </div>
          <div className="text-2xl font-extrabold text-charcoal-900">
            {rows.length} talep
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
            <tr>
              <th className="px-6 py-3">Veli</th>
              <th className="px-6 py-3">Bölge</th>
              <th className="px-6 py-3">Durum</th>
              <th className="px-6 py-3">Seçilen Servisçi</th>
              <th className="px-6 py-3 text-right">Ücret</th>
              <th className="px-6 py-3">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => router.push(`/admin/talepler/${r.id}`)}
                className="cursor-pointer hover:bg-sand-50/50"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-charcoal-900">
                    {r.parent.name}
                  </div>
                  <div className="mt-0.5 text-xs text-charcoal-500">
                    {formatPhone(r.parent.phone)}
                  </div>
                </td>
                <td className="px-6 py-4 text-charcoal-700">
                  {r.neighborhood}
                  <div className="text-xs text-charcoal-500">
                    {r.district}/{r.city}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusPill status={r.status} />
                  {r.status === 'open' && (
                    <div className="mt-1 text-xs text-charcoal-500">
                      {r.offerCount} teklif
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {r.selectedOffer ? (
                    <div>
                      <div className="font-medium text-charcoal-900">
                        {r.selectedOffer.provider.companyName}
                      </div>
                      <div className="mt-0.5 text-xs text-charcoal-500">
                        {formatPhone(r.selectedOffer.provider.phone)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-charcoal-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {r.selectedOffer ? (
                    <div className="text-base font-bold text-charcoal-900">
                      {Number(r.selectedOffer.monthlyPrice).toLocaleString('tr-TR')} ₺
                    </div>
                  ) : (
                    <span className="text-xs text-charcoal-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-charcoal-600">
                    Talep: {new Date(r.createdAt).toLocaleString('tr-TR')}
                  </div>
                  {r.selectedOffer && (
                    <div className="mt-0.5 text-xs text-emerald-700">
                      Seçim: {new Date(r.selectedOffer.selectedAt).toLocaleString('tr-TR')}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-sm text-charcoal-500">
                  Henüz talep yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    open: { cls: 'badge-warning', label: 'Açık' },
    matched: { cls: 'badge-info', label: 'Eşleşti' },
    closed: { cls: 'badge-success', label: 'Kapandı' },
  };
  const m = map[status] ?? { cls: 'badge-neutral', label: status };
  return <span className={m.cls}>{m.label}</span>;
}
