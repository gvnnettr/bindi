'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiGet, apiPost } from '@/lib/api';
import { parentSession } from '@/lib/session';
import { Button, Field, Input, Select } from '@/components/ui';

interface Student {
  id: string;
  name: string;
  class: string | null;
  school: { id: string; name: string } | null;
  isPrimary: boolean;
  relation: string;
}
interface School {
  id: string;
  name: string;
  city: string;
  district: string;
}

export default function ParentStudentsPage() {
  const [rows, setRows] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [form, setForm] = useState({ name: '', class: '', schoolId: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const token = parentSession.get();
    if (!token) return;
    try {
      const [s, sc] = await Promise.all([
        apiGet<Student[]>('/me/parent/students', token),
        apiGet<School[]>('/schools/public'),
      ]);
      setRows(s);
      setSchools(sc);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    const token = parentSession.get();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost(
        '/me/parent/students',
        {
          name: form.name,
          class: form.class || undefined,
          schoolId: form.schoolId,
        },
        token,
      );
      setForm({ name: '', class: '', schoolId: '' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Öğrenciyi silmek istediğinize emin misiniz?')) return;
    const token = parentSession.get();
    if (!token) return;
    try {
      await apiFetch(`/me/parent/students/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
            Toplam
          </div>
          <div className="text-2xl font-extrabold text-charcoal-900">
            {rows.length} öğrenci
          </div>
        </div>

        <div className="grid gap-3">
          {rows.map((s) => (
            <div key={s.id} className="card flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunset-100 text-lg font-bold text-sunset-700">
                {s.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-charcoal-900">{s.name}</div>
                <div className="text-sm text-charcoal-600">
                  {s.class && `${s.class} · `}
                  {s.school?.name ?? 'Okul belirtilmemiş'}
                </div>
                {!s.isPrimary && (
                  <div className="mt-1 text-xs text-charcoal-500">
                    İlişkiniz: {s.relation}
                  </div>
                )}
              </div>
              {s.isPrimary && (
                <button
                  className="text-xs text-red-500 hover:text-red-700"
                  onClick={() => remove(s.id)}
                >
                  Sil
                </button>
              )}
            </div>
          ))}
          {rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-charcoal-200 bg-white p-16 text-center text-sm text-charcoal-500">
              Henüz öğrenci eklemediniz.
            </div>
          )}
        </div>
      </section>

      <aside>
        <div className="card sticky top-24 p-6">
          <h2 className="text-lg font-bold text-charcoal-900">Yeni Öğrenci</h2>
          <div className="mt-4 space-y-3">
            <Field label="Ad Soyad">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Sınıf (opsiyonel)">
              <Input
                value={form.class}
                onChange={(e) => setForm({ ...form, class: e.target.value })}
              />
            </Field>
            <Field label="Okul">
              <Select
                value={form.schoolId}
                onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
              >
                <option value="">— Okul seçin —</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.city}/{s.district}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              className="w-full"
              disabled={loading || !form.name || !form.schoolId}
              onClick={add}
            >
              Ekle
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
