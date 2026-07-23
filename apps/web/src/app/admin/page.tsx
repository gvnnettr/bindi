'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { BarChart, LineChart } from '@/components/Charts';

interface Full {
  counts: {
    todayRequests: number;
    monthRequests: number;
    totalRequests: number;
    totalOffers: number;
    totalOffersSelected: number;
    totalParents: number;
    totalProviders: number;
    activeProviders: number;
    pendingProviders: number;
  };
  revenue: {
    activeMonthlyRevenue: number;
    subscriptionCount: number;
  };
  daily: Array<{ day: string; count: number }>;
  monthly: Array<{ month: string; revenue: number; count: number }>;
  topWinners: Array<{ id: string; companyName: string; wonCount: number; totalPrice: number }>;
  topRated: Array<{ id: string; companyName: string; avg: number; count: number }>;
}

interface ExpiringDoc {
  id: string;
  scope: 'company' | 'vehicle' | 'driver';
  documentName: string;
  expiresAt: string;
  daysLeft: number;
  expired: boolean;
  provider: { id: string; companyName: string; phone: string } | null;
  owner: string;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Full | null>(null);
  const [expiring, setExpiring] = useState<ExpiringDoc[]>([]);

  useEffect(() => {
    const token = adminSession.get();
    if (!token) return;
    apiGet<Full>('/admin/dashboard-full', token).then(setData).catch(() => {});
    apiGet<ExpiringDoc[]>('/admin/expiring-documents?days=30', token)
      .then(setExpiring)
      .catch(() => {});
  }, []);

  if (!data) return <div className="text-charcoal-500">Yükleniyor…</div>;

  return (
    <div className="space-y-8">
      {/* Üst KPI */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-charcoal-900">
              Panel
            </h1>
            <p className="mt-1 text-sm text-charcoal-600">
              Platformdaki güncel duruma bakış.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/bildirim" className="btn-secondary">
              Bildirim Gönder
            </Link>
            <Link href="/admin/servisciler" className="btn-primary">
              Servisçileri Yönet
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Bugün Gelen Talep" value={data.counts.todayRequests} color="sunset" />
          <StatCard label="Bu Ay Talep" value={data.counts.monthRequests} color="deepsea" />
          <StatCard label="Aktif Servisçi" value={data.counts.activeProviders} color="emerald" />
          <StatCard
            label="Onay Bekleyen"
            value={data.counts.pendingProviders}
            color="amber"
            highlight={!!data.counts.pendingProviders}
          />
        </div>
      </div>

      {/* Gelir + Kabul */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="card p-6 md:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
            Aktif Abonelik Ayl Gelir
          </div>
          <div className="mt-2 text-4xl font-extrabold text-charcoal-900">
            {data.revenue.activeMonthlyRevenue.toLocaleString('tr-TR')} ₺
          </div>
          <div className="mt-1 text-sm text-charcoal-500">
            {data.revenue.subscriptionCount} aktif abonelik
          </div>
        </div>

        <div className="card p-6 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
            Kabul Edilen Teklif Cirosu — Son 12 Ay
          </div>
          <div className="mt-4">
            <LineChart
              data={data.monthly.map((m) => ({
                label: m.month.slice(5) + '',
                value: m.revenue,
              }))}
            />
          </div>
          <div className="mt-2 flex justify-end text-xs text-charcoal-500">
            Toplam: {data.monthly.reduce((s, m) => s + m.revenue, 0).toLocaleString('tr-TR')} ₺
          </div>
        </div>
      </div>

      {/* Son 30 gün */}
      <div className="card p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
          Son 30 Gün — Günlük Talep
        </div>
        <div className="mt-4">
          <BarChart
            data={data.daily.map((d) => ({
              label: d.day.slice(5),
              value: d.count,
            }))}
          />
        </div>
      </div>

      {/* Servisçi performansı */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-charcoal-900">🏆 En Çok Kazanan</h2>
          <div className="mt-3 space-y-2">
            {data.topWinners.length === 0 ? (
              <div className="rounded-lg border border-dashed border-charcoal-200 p-4 text-center text-sm text-charcoal-500">
                Henüz kabul edilmiş teklif yok.
              </div>
            ) : (
              data.topWinners.map((w, i) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-lg border border-charcoal-100 bg-sand-50/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sunset-500 text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-medium text-charcoal-900">{w.companyName}</div>
                      <div className="text-xs text-charcoal-500">
                        {w.wonCount} kazanılan teklif
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-charcoal-900">
                    {w.totalPrice.toLocaleString('tr-TR')} ₺
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-charcoal-900">⭐ En Yüksek Puanlı</h2>
          <div className="mt-3 space-y-2">
            {data.topRated.length === 0 ? (
              <div className="rounded-lg border border-dashed border-charcoal-200 p-4 text-center text-sm text-charcoal-500">
                Henüz puan verilmemiş.
              </div>
            ) : (
              data.topRated.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-charcoal-100 bg-sand-50/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-medium text-charcoal-900">{r.companyName}</div>
                      <div className="text-xs text-charcoal-500">{r.count} yorum</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-charcoal-900">
                    ★ {r.avg.toFixed(1)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Genel toplamlar */}
      <div className="grid gap-4 md:grid-cols-4">
        <MiniCount label="Toplam Veli" value={data.counts.totalParents} />
        <MiniCount label="Toplam Servisçi" value={data.counts.totalProviders} />
        <MiniCount label="Toplam Talep" value={data.counts.totalRequests} />
        <MiniCount
          label="Kabul / Verilen Teklif"
          value={`${data.counts.totalOffersSelected} / ${data.counts.totalOffers}`}
        />
      </div>

      <ExpiringDocumentsWidget rows={expiring} />
    </div>
  );
}

function ExpiringDocumentsWidget({ rows }: { rows: ExpiringDoc[] }) {
  const expired = rows.filter((r) => r.expired);
  const soon = rows.filter((r) => !r.expired);

  const scopeLabel = (s: string) =>
    s === 'company' ? 'Şirket' : s === 'vehicle' ? 'Araç' : 'Şoför';
  const scopeCls = (s: string) =>
    s === 'company'
      ? 'bg-charcoal-100 text-charcoal-700'
      : s === 'vehicle'
        ? 'bg-sunset-100 text-sunset-700'
        : 'bg-deepsea-100 text-deepsea-700';

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-charcoal-100 bg-sand-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-charcoal-900">
              Belge Süresi Takibi
            </h2>
            <p className="mt-1 text-xs text-charcoal-500">
              30 gün içinde bitecek + süresi geçmiş belgeler.
            </p>
          </div>
          <div className="flex gap-2">
            {expired.length > 0 && (
              <span
                className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white"
              >
                {expired.length} süresi geçti
              </span>
            )}
            {soon.length > 0 && (
              <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
                {soon.length} yaklaşıyor
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-charcoal-500">
            🎉 30 gün içinde biten belge yok.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-charcoal-100 bg-white text-left text-xs uppercase tracking-wider text-charcoal-500">
              <tr>
                <th className="px-6 py-3">Servisçi</th>
                <th className="px-6 py-3">Kapsam</th>
                <th className="px-6 py-3">Belge</th>
                <th className="px-6 py-3">Bitiş</th>
                <th className="px-6 py-3 text-right">Kalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100">
              {rows.map((r) => (
                <tr key={`${r.scope}-${r.id}`} className="hover:bg-sand-50/40">
                  <td className="px-6 py-3">
                    {r.provider ? (
                      <Link
                        href={`/admin/servisciler/${r.provider.id}`}
                        className="font-semibold text-charcoal-900 hover:text-sunset-600"
                      >
                        {r.provider.companyName}
                      </Link>
                    ) : (
                      <span className="text-charcoal-400">—</span>
                    )}
                    {r.owner && (
                      <div className="text-xs text-charcoal-500">{r.owner}</div>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${scopeCls(r.scope)}`}
                    >
                      {scopeLabel(r.scope)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-charcoal-700">
                    {r.documentName}
                  </td>
                  <td className="px-6 py-3 text-xs text-charcoal-600">
                    {new Date(r.expiresAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {r.expired ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                        {Math.abs(r.daysLeft)} gün geçti
                      </span>
                    ) : r.daysLeft <= 7 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                        {r.daysLeft} gün
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-charcoal-700">
                        {r.daysLeft} gün
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: number;
  color: 'sunset' | 'deepsea' | 'emerald' | 'amber';
  highlight?: boolean;
}) {
  const accent =
    color === 'sunset'
      ? 'bg-sunset-500'
      : color === 'deepsea'
        ? 'bg-deepsea-600'
        : color === 'emerald'
          ? 'bg-emerald-500'
          : 'bg-amber-500';
  return (
    <div
      className={
        'relative overflow-hidden rounded-xl border p-5 shadow-card transition ' +
        (highlight ? 'border-amber-200 bg-amber-50' : 'border-charcoal-100 bg-white')
      }
    >
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10 ${accent}`} />
      <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold text-charcoal-900">{value}</div>
    </div>
  );
}

function MiniCount({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-charcoal-100 bg-white p-4 text-center">
      <div className="text-xs text-charcoal-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-charcoal-900">{value}</div>
    </div>
  );
}
