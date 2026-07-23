'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiGet, apiPost } from '@/lib/api';
import { parentSession } from '@/lib/session';
import { Button, Field, Input, Select } from '@/components/ui';

interface Student {
  id: string;
  name: string;
  isPrimary: boolean;
}
interface GuardianRow {
  id: string;
  relation: string;
  isPrimary: boolean;
  student: { id: string; name: string };
  parent: { id: string; name: string; phone: string };
}

const RELATIONS = [
  'baba',
  'anne',
  'dede',
  'anneanne',
  'babaanne',
  'amca',
  'dayı',
  'teyze',
  'hala',
  'diğer',
];

export default function ParentGuardiansPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<GuardianRow[]>([]);
  const [form, setForm] = useState({
    phone: '',
    name: '',
    relation: 'anne',
    studentIds: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const token = parentSession.get();
    if (!token) return;
    try {
      const [s, g] = await Promise.all([
        apiGet<Student[]>('/me/parent/students', token),
        apiGet<GuardianRow[]>('/me/parent/guardians', token),
      ]);
      setStudents(s.filter((st) => st.isPrimary));
      setRows(g);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function invite() {
    const token = parentSession.get();
    if (!token) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await apiPost('/me/parent/guardians', form, token);
      setNotice(`Davet SMS'i gönderildi.`);
      setForm({ phone: '', name: '', relation: 'anne', studentIds: [] });
      await load();
      setTimeout(() => setNotice(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Aile üyesini kaldırmak istediğinize emin misiniz?')) return;
    const token = parentSession.get();
    if (!token) return;
    try {
      await apiFetch(`/me/parent/guardians/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
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

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-charcoal-500">
            Aile Üyeleri
          </div>
          <div className="text-2xl font-extrabold text-charcoal-900">
            {rows.length} kayıt
          </div>
          <p className="mt-1 text-sm text-charcoal-500">
            Eklediğiniz kişiler çocuklarınızın taleplerini ve tekliflerini görebilir.
          </p>
        </div>

        <div className="grid gap-3">
          {rows.map((g) => (
            <div key={g.id} className="card flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-deepsea-100 font-bold text-deepsea-700">
                {g.parent.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-charcoal-900">
                  {g.parent.name}
                </div>
                <div className="text-sm text-charcoal-600">{g.parent.phone}</div>
                <div className="mt-1 text-xs text-charcoal-500">
                  {g.student.name} — <span className="capitalize">{g.relation}</span>
                  {g.isPrimary && ' (ana veli)'}
                </div>
              </div>
              {!g.isPrimary && (
                <button
                  className="text-xs text-red-500 hover:text-red-700"
                  onClick={() => remove(g.id)}
                >
                  Kaldır
                </button>
              )}
            </div>
          ))}
          {rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-charcoal-200 bg-white p-16 text-center text-sm text-charcoal-500">
              Henüz aile üyesi eklemediniz.
            </div>
          )}
        </div>
      </section>

      <aside>
        <div className="card sticky top-24 p-6">
          <h2 className="text-lg font-bold text-charcoal-900">Aile Üyesi Davet Et</h2>
          <p className="mt-1 text-xs text-charcoal-500">
            SMS ile davet gönderilir, telefon numarasıyla panele girebilir.
          </p>

          <div className="mt-4 space-y-3">
            <Field label="Ad Soyad">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: Ayşe Güven"
              />
            </Field>
            <Field label="Telefon">
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="05xx xxx xx xx"
              />
            </Field>
            <Field label="Yakınlık">
              <Select
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <label className="label">Öğrenciler</label>
              <div className="space-y-1 rounded-lg border border-charcoal-200 bg-white p-3">
                {students.length === 0 ? (
                  <div className="text-xs text-charcoal-500">
                    Önce Öğrencilerim'den ekleyin.
                  </div>
                ) : (
                  students.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.studentIds.includes(s.id)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            studentIds: e.target.checked
                              ? [...form.studentIds, s.id]
                              : form.studentIds.filter((x) => x !== s.id),
                          })
                        }
                      />
                      <span>{s.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <Button
              className="w-full"
              disabled={
                loading ||
                !form.phone ||
                !form.name ||
                form.studentIds.length === 0
              }
              onClick={invite}
            >
              Davet Gönder
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
