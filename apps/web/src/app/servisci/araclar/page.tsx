'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, apiGet, apiPost } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { Button, Field, Input } from '@/components/ui';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  seats: number;
}

interface FormState {
  id?: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  seats: number;
}

const EMPTY: FormState = {
  brand: '',
  model: '',
  year: 2023,
  plate: '',
  seats: 14,
};

export default function AraclarPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);

  const editing = !!form.id;

  async function load() {
    const token = providerSession.get();
    if (!token) return;
    apiGet<Vehicle[]>('/me/vehicles', token)
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    const token = providerSession.get();
    if (!token) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (editing && form.id) {
        await apiFetch(`/me/vehicles/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            brand: form.brand,
            model: form.model,
            year: form.year,
            plate: form.plate,
            seats: form.seats,
          }),
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotice('Araç güncellendi.');
      } else {
        const created = await apiPost<{ id: string }>('/me/vehicles', form, token);
        setForm(EMPTY);
        await load();
        // Yeni araç için doğrudan detay sayfasına yönlendir (belge yükleme adımına)
        if (created?.id) {
          router.push(`/servisci/araclar/${created.id}?newVehicle=1`);
          return;
        }
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

  async function remove(v: Vehicle) {
    if (!confirm(`${v.brand} ${v.model} (${v.plate}) silinsin mi?`)) return;
    const token = providerSession.get();
    if (!token) return;
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/me/vehicles/${v.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (form.id === v.id) setForm(EMPTY);
      setNotice('Araç silindi.');
      await load();
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEdit(v: Vehicle) {
    setForm({
      id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year,
      plate: v.plate,
      seats: v.seats,
    });
    setError(null);
    if (typeof window !== 'undefined')
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
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
            Filo
          </div>
          <div className="text-2xl font-extrabold text-charcoal-900">
            {rows.length} araç
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((v) => (
            <div key={v.id} className="card overflow-hidden">
              <div className="flex items-center gap-4 border-b border-charcoal-100 bg-sand-50 p-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-charcoal-900 text-2xl">
                  🚐
                </div>
                <div className="flex-1">
                  <div className="font-bold text-charcoal-900">
                    {v.brand} {v.model}
                  </div>
                  <div className="text-xs text-charcoal-500">Model yılı: {v.year}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    className="rounded-md p-2 text-charcoal-500 hover:bg-charcoal-100 hover:text-charcoal-900"
                    title="Düzenle"
                    onClick={() => startEdit(v)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="rounded-md p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                    title="Sil"
                    onClick={() => remove(v)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-charcoal-100 text-center text-sm">
                <div className="p-4">
                  <div className="text-xs uppercase tracking-widest text-charcoal-500">
                    Plaka
                  </div>
                  <div className="mt-1 font-bold text-charcoal-900">{v.plate}</div>
                </div>
                <div className="p-4">
                  <div className="text-xs uppercase tracking-widest text-charcoal-500">
                    Kapasite
                  </div>
                  <div className="mt-1 font-bold text-charcoal-900">
                    {v.seats} kişi
                  </div>
                </div>
              </div>
              <Link
                href={`/servisci/araclar/${v.id}`}
                className="block border-t border-charcoal-100 bg-sand-50 px-4 py-3 text-center text-sm font-semibold text-sunset-600 transition hover:bg-sunset-50 hover:text-sunset-700"
              >
                📄 Belgeler & Sigorta →
              </Link>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-charcoal-200 bg-white p-12 text-center text-sm text-charcoal-500">
              Henüz araç eklemediniz. Sağdan ilk aracınızı ekleyin.
            </div>
          )}
        </div>
      </section>

      <aside>
        <div className="card sticky top-24 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-charcoal-900">
              {editing ? 'Aracı Düzenle' : 'Yeni Araç'}
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
              : 'Teklif verirken velilere gösterilir.'}
          </p>

          <div className="mt-4 space-y-3">
            <Field label="Marka">
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Mercedes"
              />
            </Field>
            <Field label="Model">
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="Sprinter"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Yıl">
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                />
              </Field>
              <Field label="Koltuk">
                <Input
                  type="number"
                  value={form.seats}
                  onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Plaka">
              <Input
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: e.target.value })}
                placeholder="34 ABC 123"
              />
            </Field>
            <Button
              className="w-full"
              disabled={loading || !form.brand || !form.model || !form.plate}
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
