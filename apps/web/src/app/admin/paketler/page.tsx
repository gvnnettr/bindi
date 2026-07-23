'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button, Input } from '@/components/ui';

interface Package {
  code: string;
  name: string;
  monthlyPrice: string;
}

export default function AdminPackagesPage() {
  const [rows, setRows] = useState<Package[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function load() {
    const token = adminSession.get();
    if (!token) return;
    const data = await apiGet<Package[]>('/admin/packages', token);
    setRows(data);
    setPrices(Object.fromEntries(data.map((p) => [p.code, p.monthlyPrice])));
  }
  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, []);

  async function save(code: string) {
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPatch(`/admin/packages/${code}`, { monthlyPrice: prices[code] }, token);
      setSaved(code);
      setTimeout(() => setSaved(null), 2000);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((p) => (
          <div key={p.code} className="card overflow-hidden">
            <div className="relative bg-charcoal-900 p-6 text-white">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sunset-500/20 blur-xl" />
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-400">
                  {p.code}
                </div>
                <div className="mt-1 text-xl font-extrabold">{p.name}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-sunset-400">
                    {Number(prices[p.code] ?? p.monthlyPrice).toLocaleString('tr-TR')}
                  </span>
                  <span className="text-sm font-medium text-charcoal-300">₺ / ay</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <label className="label">Aylık Fiyat</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={prices[p.code] ?? ''}
                  onChange={(e) => setPrices({ ...prices, [p.code]: e.target.value })}
                />
                <Button onClick={() => save(p.code)}>
                  {saved === p.code ? '✓' : 'Kaydet'}
                </Button>
              </div>
              <div className="mt-3 text-xs text-charcoal-500">
                {p.code === 'teklif'
                  ? 'Servisçi teklif verme + eşleşen talepleri görme.'
                  : 'Öğrenci/veli takibi, ödeme, POS, hatırlatmalar (Faz 2).'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
