'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiGet, apiPost } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button, Field, Input } from '@/components/ui';
import { TURKEY_CITIES } from '@servis/shared';

interface EnabledCity {
  id: string;
  city: string;
  createdAt: string;
}

export default function AdminCitiesPage() {
  const [rows, setRows] = useState<EnabledCity[]>([]);
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const token = adminSession.get();
    if (!token) return;
    try {
      const r = await apiGet<EnabledCity[]>('/admin/cities', token);
      setRows(r);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!city) return;
    const token = adminSession.get();
    if (!token) return;
    setLoading(true);
    try {
      await apiPost('/admin/cities', { city }, token);
      setCity('');
      setNotice(`${city} eklendi.`);
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(row: EnabledCity) {
    if (!confirm(`${row.city} listeden çıkarılacak. Devam?`)) return;
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiFetch(`/admin/cities/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotice(`${row.city} kaldırıldı.`);
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const enabledSet = new Set(rows.map((r) => r.city));
  const availableCities = TURKEY_CITIES.filter((c) => !enabledSet.has(c));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
            Aktif Şehirler
          </div>
          <div className="text-2xl font-extrabold text-charcoal-900">
            {rows.length} şehir
          </div>
          <p className="mt-1 text-sm text-charcoal-500">
            Bu listeye eklenen şehirler veli ve servisçi kayıt formlarında görünür. Kaldırılan şehirler yeni kayıtlarda seçilemez (mevcut kayıtlar etkilenmez).
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-charcoal-200 bg-white p-12 text-center text-sm text-charcoal-500">
            Henüz aktif şehir yok. Sağdan ilk şehri ekleyin.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
                <tr>
                  <th className="px-4 py-3">Şehir</th>
                  <th className="px-4 py-3">Eklenme</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-charcoal-100 last:border-0">
                    <td className="px-4 py-3 font-semibold text-charcoal-900">
                      {r.city}
                    </td>
                    <td className="px-4 py-3 text-xs text-charcoal-500">
                      {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(r)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Kaldır
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside>
        <div className="card sticky top-24 p-6">
          <h2 className="text-lg font-bold text-charcoal-900">Şehir Ekle</h2>
          <p className="mt-1 text-xs text-charcoal-500">
            Aktif olarak açmak istediğiniz şehri seçin. Bu şehrin tüm ilçeleri veli/servisçi kayıt formlarında görünür.
          </p>
          <div className="mt-4 space-y-3">
            <Field label="Şehir">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
              >
                <option value="">— seç —</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Button className="w-full" disabled={loading || !city} onClick={add}>
              Ekle
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
