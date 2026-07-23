'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiGet, apiPost } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button, Field, Input } from '@/components/ui';

interface School {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
}

interface FormState {
  id?: string;
  name: string;
  city: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  active: boolean;
}

const EMPTY: FormState = { name: '', city: '', district: '', address: '', latitude: '', longitude: '', active: true };

export default function AdminSchoolsPage() {
  const [rows, setRows] = useState<School[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const editing = !!form.id;

  async function load() {
    const token = adminSession.get();
    if (!token) return;
    try {
      const data = await apiGet<School[]>('/admin/schools', token);
      setRows(data);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    const token = adminSession.get();
    if (!token) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const lat = form.latitude ? Number(form.latitude) : undefined;
      const lng = form.longitude ? Number(form.longitude) : undefined;
      if (editing && form.id) {
        await apiFetch<School>(`/admin/schools/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name,
            city: form.city,
            district: form.district,
            address: form.address || undefined,
            latitude: lat,
            longitude: lng,
            active: form.active,
          }),
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotice('Okul güncellendi.');
      } else {
        await apiPost(
          '/admin/schools',
          {
            name: form.name,
            city: form.city,
            district: form.district,
            address: form.address || undefined,
            latitude: lat,
            longitude: lng,
          },
          token,
        );
        setNotice('Okul eklendi.');
      }
      setForm(EMPTY);
      await load();
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(school: School) {
    if (!confirm(`"${school.name}" silinsin mi?`)) return;
    const token = adminSession.get();
    if (!token) return;
    try {
      const r = await apiFetch<{ ok: boolean; softDeleted?: boolean }>(
        `/admin/schools/${school.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotice(
        r.softDeleted
          ? 'Kayıt bağlantılı olduğu için pasifleştirildi.'
          : 'Okul silindi.',
      );
      if (form.id === school.id) setForm(EMPTY);
      await load();
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEdit(s: School) {
    setForm({
      id: s.id,
      name: s.name,
      city: s.city,
      district: s.district,
      address: s.address ?? '',
      latitude: s.latitude != null ? String(s.latitude) : '',
      longitude: s.longitude != null ? String(s.longitude) : '',
      active: s.active,
    });
    setError(null);
    if (typeof window !== 'undefined')
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const filtered = rows.filter(
    (r) =>
      !q ||
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.city.toLowerCase().includes(q.toLowerCase()) ||
      r.district.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-4">
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
              Toplam
            </div>
            <div className="text-2xl font-extrabold text-charcoal-900">
              {rows.length} okul
            </div>
          </div>
          <Input
            placeholder="Ara: okul adı, il, ilçe…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
              <tr>
                <th className="px-6 py-3">Ad</th>
                <th className="px-6 py-3">İl / İlçe</th>
                <th className="px-6 py-3">Durum</th>
                <th className="px-6 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-sand-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-charcoal-900">{s.name}</div>
                    {s.address && (
                      <div className="text-xs text-charcoal-500">{s.address}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-charcoal-700">
                    {s.city} / {s.district}
                  </td>
                  <td className="px-6 py-4">
                    {s.active ? (
                      <span className="badge-success">Aktif</span>
                    ) : (
                      <span className="badge-neutral">Pasif</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        className="rounded-md p-2 text-charcoal-500 hover:bg-charcoal-100 hover:text-charcoal-900"
                        onClick={() => startEdit(s)}
                        aria-label="Düzenle"
                        title="Düzenle"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="rounded-md p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                        onClick={() => remove(s)}
                        aria-label="Sil"
                        title="Sil"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-sm text-charcoal-500">
                    Kayıt yok. Sağdan yeni ekleyin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside>
        <div className="card sticky top-24 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-charcoal-900">
              {editing ? 'Okulu Düzenle' : 'Yeni Okul'}
            </h2>
            {editing && (
              <button
                className="text-xs text-charcoal-500 hover:text-charcoal-900"
                onClick={() => setForm(EMPTY)}
              >
                Vazgeç
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-charcoal-500">
            {editing
              ? 'Değişiklikleri kaydedin.'
              : 'Veliler bu listeden seçim yapıyor.'}
          </p>

          <div className="mt-4 space-y-3">
            <Field label="Okul Adı">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="İl">
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
              <Field label="İlçe">
                <Input
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Adres (opsiyonel)">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Enlem (lat)" hint="Örn 40.9950">
                <Input
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="40.9950"
                  inputMode="decimal"
                />
              </Field>
              <Field label="Boylam (lng)" hint="Örn 37.8783">
                <Input
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="37.8783"
                  inputMode="decimal"
                />
              </Field>
            </div>
            <p className="text-xs text-charcoal-500">
              Enlem/boylam veli talep konumu ile okul mesafesinin (km + dakika) hesaplanmasında kullanılır. Google Maps'te okulu bulup sağ tık &gt; "Neresi burası?" ile alabilirsin.
            </p>

            {editing && (
              <label className="flex items-center gap-2 rounded-lg border border-charcoal-100 bg-sand-50/50 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span className="font-semibold text-charcoal-800">Aktif</span>
              </label>
            )}

            <Button
              className="w-full"
              disabled={loading || !form.name || !form.city || !form.district}
              onClick={save}
            >
              {editing ? 'Kaydet' : 'Ekle'}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
