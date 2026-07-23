'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { TakipGate } from '@/components/TakipGate';

interface Report {
  activeStudents: number;
  monthly: Array<{
    period: string;
    label: string;
    paid: number;
    pending: number;
    late: number;
    expected: number;
  }>;
  totals: {
    currentMonthCollected: number;
    currentMonthPending: number;
    currentMonthLate: number;
    last12MonthsCollected: number;
    allTimeCollected: number;
  };
}

export default function RaporPage() {
  return (
    <TakipGate>
      <RaporContent />
    </TakipGate>
  );
}

function RaporContent() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = providerSession.get();
    if (!token) return;
    apiGet<Report>('/me/payments/report', token)
      .then(setReport)
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!report) return <div className="text-charcoal-500">Yükleniyor…</div>;

  const maxExpected = Math.max(
    ...report.monthly.map((m) => m.expected),
    1,
  );
  const collectionRate =
    report.totals.last12MonthsCollected /
    Math.max(report.monthly.reduce((s, m) => s + m.expected, 0), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-charcoal-900">
          Kazanç Raporu
        </h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Son 12 aylık tahsilat performansınız.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Bu Ay Tahsil"
          value={'₺' + report.totals.currentMonthCollected.toLocaleString('tr-TR')}
          accent="emerald"
        />
        <Stat
          label="Bu Ay Bekleyen"
          value={'₺' + report.totals.currentMonthPending.toLocaleString('tr-TR')}
          accent="amber"
        />
        <Stat
          label="Bu Ay Gecikmiş"
          value={'₺' + report.totals.currentMonthLate.toLocaleString('tr-TR')}
          accent="red"
        />
        <Stat
          label="Aktif Öğrenci"
          value={String(report.activeStudents)}
          accent="deepsea"
        />
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-charcoal-900">
              Aylık Tahsilat (Son 12 Ay)
            </h2>
            <p className="mt-1 text-xs text-charcoal-500">
              Toplam Tahsilat:{' '}
              <b>
                ₺{report.totals.last12MonthsCollected.toLocaleString('tr-TR')}
              </b>{' '}
              · Ortalama tahsilat oranı: <b>{Math.round(collectionRate * 100)}%</b>
            </p>
          </div>
        </div>
        <BarChart
          data={report.monthly.map((m) => ({
            label: m.label,
            paid: m.paid,
            expected: m.expected,
          }))}
          max={maxExpected}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-charcoal-100 bg-sand-50 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-500">
            Aylık Detay
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-charcoal-100 bg-white text-left text-xs uppercase tracking-wider text-charcoal-500">
            <tr>
              <th className="px-6 py-3">Ay</th>
              <th className="px-6 py-3 text-right">Beklenen</th>
              <th className="px-6 py-3 text-right text-emerald-700">Tahsil</th>
              <th className="px-6 py-3 text-right text-amber-700">Bekleyen</th>
              <th className="px-6 py-3 text-right text-red-700">Gecikmiş</th>
              <th className="px-6 py-3 text-right">Oran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {report.monthly
              .slice()
              .reverse()
              .map((m) => {
                const rate = m.expected ? m.paid / m.expected : 0;
                return (
                  <tr key={m.period} className="hover:bg-sand-50/40">
                    <td className="px-6 py-3 font-semibold text-charcoal-900">
                      {m.label}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      ₺{m.expected.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-emerald-700">
                      ₺{m.paid.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-amber-700">
                      ₺{m.pending.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-red-700">
                      ₺{m.late.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={
                          'rounded-full px-2 py-0.5 text-xs font-bold ' +
                          (rate >= 0.9
                            ? 'bg-emerald-100 text-emerald-800'
                            : rate >= 0.6
                              ? 'bg-amber-100 text-amber-800'
                              : m.expected === 0
                                ? 'bg-charcoal-100 text-charcoal-500'
                                : 'bg-red-100 text-red-700')
                        }
                      >
                        {m.expected ? Math.round(rate * 100) + '%' : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'emerald' | 'amber' | 'red' | 'deepsea';
}) {
  const accentCls =
    accent === 'emerald'
      ? 'bg-emerald-500'
      : accent === 'amber'
        ? 'bg-amber-500'
        : accent === 'red'
          ? 'bg-red-500'
          : 'bg-deepsea-500';
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <span className={'h-1.5 w-1.5 rounded-full ' + accentCls} />
        <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
          {label}
        </div>
      </div>
      <div className="mt-2 text-2xl font-black text-charcoal-900">{value}</div>
    </div>
  );
}

function BarChart({
  data,
  max,
}: {
  data: { label: string; paid: number; expected: number }[];
  max: number;
}) {
  return (
    <div className="flex h-64 items-end gap-2 overflow-x-auto pb-2">
      {data.map((d) => {
        const paidH = max ? (d.paid / max) * 100 : 0;
        const expectedH = max ? (d.expected / max) * 100 : 0;
        return (
          <div
            key={d.label}
            className="flex min-w-[40px] flex-1 flex-col items-center"
            title={`${d.label} · ₺${d.paid.toLocaleString('tr-TR')} / ₺${d.expected.toLocaleString('tr-TR')}`}
          >
            <div className="relative flex h-full w-full items-end">
              <div
                className="w-full rounded-t bg-sand-200"
                style={{ height: `${expectedH}%` }}
              />
              <div
                className="absolute inset-x-0 bottom-0 w-full rounded-t bg-emerald-500 transition-all"
                style={{ height: `${paidH}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] font-semibold text-charcoal-600">
              {d.label}
            </div>
            <div className="text-[10px] text-charcoal-500">
              ₺{Math.round(d.paid / 1000)}k
            </div>
          </div>
        );
      })}
    </div>
  );
}
