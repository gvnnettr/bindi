'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { adminSession } from '@/lib/session';

interface LogRow {
  id: string;
  adminId: string | null;
  adminEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  'company_doc.approved': 'Şirket belgesi onayı',
  'company_doc.rejected': 'Şirket belgesi red',
  'vehicle_doc.approved': 'Araç belgesi onayı',
  'vehicle_doc.rejected': 'Araç belgesi red',
  'driver_doc.approved': 'Şoför belgesi onayı',
  'driver_doc.rejected': 'Şoför belgesi red',
  'provider.approved': 'Servisçi onayı',
  'provider.status_changed': 'Servisçi durum değişikliği',
  'provider.deleted': 'Servisçi silme',
  'admin.created': 'Admin oluşturma',
  'admin.deleted': 'Admin silme',
};

function actionClass(action: string) {
  if (action.endsWith('.rejected') || action.endsWith('.deleted'))
    return 'bg-red-100 text-red-700';
  if (action.endsWith('.approved') || action.endsWith('.created'))
    return 'bg-emerald-100 text-emerald-800';
  return 'bg-charcoal-100 text-charcoal-700';
}

export default function AdminLogPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = adminSession.get();
    if (!token) return;
    apiGet<LogRow[]>('/admin/activity-log?limit=200', token)
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black text-charcoal-900">Aktivite Kaydı</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Adminlerin kritik aksiyonlarının tarihçesi.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
            <tr>
              <th className="px-6 py-3">Zaman</th>
              <th className="px-6 py-3">Admin</th>
              <th className="px-6 py-3">Aksiyon</th>
              <th className="px-6 py-3">Detay</th>
              <th className="px-6 py-3">Hedef</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-sand-50/40">
                <td className="px-6 py-3 text-xs text-charcoal-600">
                  {new Date(r.createdAt).toLocaleString('tr-TR')}
                </td>
                <td className="px-6 py-3 text-xs text-charcoal-700">
                  {r.adminEmail ?? '—'}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                      actionClass(r.action)
                    }
                  >
                    {ACTION_LABELS[r.action] ?? r.action}
                  </span>
                </td>
                <td className="px-6 py-3 text-charcoal-700">
                  {r.summary ?? '—'}
                </td>
                <td className="px-6 py-3 text-xs">
                  {r.targetType === 'provider' && r.targetId ? (
                    <Link
                      href={`/admin/servisciler/${r.targetId}`}
                      className="text-sunset-600 hover:text-sunset-700"
                    >
                      Servisçi →
                    </Link>
                  ) : (
                    <span className="text-charcoal-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-sm text-charcoal-500">
                  Henüz aktivite yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
