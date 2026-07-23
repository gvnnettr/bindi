'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button } from '@/components/ui';

interface DocDef {
  id: string;
  code: string;
  name: string;
  scope: 'vehicle' | 'company' | 'driver';
  required: boolean;
  sortOrder: number;
  active: boolean;
  requiresExpiry: boolean;
  description: string | null;
}

const SCOPE_LABELS: Record<string, string> = {
  company: 'Şirket',
  vehicle: 'Araç',
  driver: 'Şoför',
};

export default function BelgeTanimlariPage() {
  const [rows, setRows] = useState<DocDef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DocDef | null>(null);

  async function load() {
    const token = adminSession.get();
    if (!token) return;
    try {
      const rs = await apiGet<DocDef[]>('/admin/document-definitions', token);
      setRows(rs);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(id: string, field: 'required' | 'active', value: boolean) {
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPatch(`/admin/document-definitions/${id}`, { [field]: value }, token);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function bulkToggle(
    scope: string,
    field: 'required' | 'active',
    value: boolean,
  ) {
    const token = adminSession.get();
    if (!token) return;
    const targets = rows.filter((r) => r.scope === scope);
    if (targets.length === 0) return;
    const label = field === 'required' ? 'zorunlu' : 'aktif';
    if (
      !confirm(
        `${SCOPE_LABELS[scope]} kategorisindeki ${targets.length} belgenin ${label} durumunu ${value ? 'AÇMAK' : 'KAPATMAK'} istediğinize emin misiniz?`,
      )
    )
      return;
    try {
      await Promise.all(
        targets.map((r) =>
          apiPatch(`/admin/document-definitions/${r.id}`, { [field]: value }, token),
        ),
      );
      setNotice(
        `${SCOPE_LABELS[scope]} — ${targets.length} belge ${label} ${value ? 'açıldı' : 'kapatıldı'}.`,
      );
      setTimeout(() => setNotice(null), 3000);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(row: DocDef) {
    if (!confirm(`"${row.name}" belge tanımını pasife almak istediğinize emin misiniz?`))
      return;
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiDelete(`/admin/document-definitions/${row.id}`, token);
      setNotice('Belge tanımı pasife alındı.');
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const grouped = ['company', 'vehicle', 'driver'].map((scope) => ({
    scope,
    rows: rows.filter((r) => r.scope === scope),
  }));

  return (
    <div className="space-y-6">
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

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-charcoal-900">Belge Tanımları</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Servisçilerin yüklemesi gereken belge tipleri. Zorunlu işaretlenenler
            eksikse servisçi uyarı görür.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Yeni Belge Tanımı</Button>
      </div>

      {grouped.map(({ scope, rows: sr }) => (
        <div key={scope} className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal-100 bg-sand-50 px-6 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-500">
              {SCOPE_LABELS[scope]} Belgeleri ({sr.length})
            </h2>
            {sr.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => bulkToggle(scope, 'required', true)}
                  className="rounded-md border border-charcoal-200 bg-white px-2 py-1 font-semibold text-charcoal-700 hover:bg-sand-100"
                >
                  Tümünü Zorunlu Yap
                </button>
                <button
                  onClick={() => bulkToggle(scope, 'required', false)}
                  className="rounded-md border border-charcoal-200 bg-white px-2 py-1 font-semibold text-charcoal-700 hover:bg-sand-100"
                >
                  Tümünü Opsiyonel Yap
                </button>
                <button
                  onClick={() => bulkToggle(scope, 'active', true)}
                  className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  Tümünü Aktif Et
                </button>
                <button
                  onClick={() => bulkToggle(scope, 'active', false)}
                  className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700 hover:bg-red-100"
                >
                  Tümünü Pasife Al
                </button>
              </div>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-charcoal-100 bg-white text-left text-xs uppercase tracking-wider text-charcoal-500">
              <tr>
                <th className="px-6 py-3">Ad</th>
                <th className="px-6 py-3">Kod</th>
                <th className="px-6 py-3">Zorunlu</th>
                <th className="px-6 py-3">Son Kul. Tarihi</th>
                <th className="px-6 py-3">Aktif</th>
                <th className="px-6 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100">
              {sr.map((r) => (
                <tr
                  key={r.id}
                  className={
                    'hover:bg-sand-50/40 ' + (r.active ? '' : 'opacity-50')
                  }
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-charcoal-900">{r.name}</div>
                    {r.description && (
                      <div className="mt-1 text-xs text-charcoal-500">
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-charcoal-500">
                    {r.code}
                  </td>
                  <td className="px-6 py-4">
                    <Toggle
                      checked={r.required}
                      onChange={(v) => toggle(r.id, 'required', v)}
                    />
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {r.requiresExpiry ? (
                      <span className="text-charcoal-700">Sorulur</span>
                    ) : (
                      <span className="text-charcoal-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Toggle
                      checked={r.active}
                      onChange={(v) => toggle(r.id, 'active', v)}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-3">
                      <button
                        onClick={() => setEditing(r)}
                        className="text-xs font-semibold text-sunset-600 hover:text-sunset-700"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => remove(r)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Pasif
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sr.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-charcoal-500"
                  >
                    Bu kategoride belge tanımı yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}

      {showCreate && (
        <FormModal
          title="Yeni Belge Tanımı"
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            setNotice('Belge tanımı eklendi.');
            setTimeout(() => setNotice(null), 2500);
            load();
          }}
          onError={setError}
        />
      )}
      {editing && (
        <FormModal
          title={`Düzenle: ${editing.name}`}
          initial={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            setNotice('Belge tanımı güncellendi.');
            setTimeout(() => setNotice(null), 2500);
            load();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function FormModal({
  title,
  initial,
  onClose,
  onSuccess,
  onError,
}: {
  title: string;
  initial?: DocDef;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [scope, setScope] = useState(initial?.scope ?? 'vehicle');
  const [required, setRequired] = useState(initial?.required ?? false);
  const [requiresExpiry, setRequiresExpiry] = useState(
    initial?.requiresExpiry ?? false,
  );
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 100);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = adminSession.get();
    if (!token) return;
    const payload = {
      code,
      name,
      scope,
      required,
      requiresExpiry,
      sortOrder,
      description: description || undefined,
    };
    try {
      if (initial) {
        await apiPatch(
          `/admin/document-definitions/${initial.id}`,
          payload,
          token,
        );
      } else {
        await apiPost('/admin/document-definitions', payload, token);
      }
      onSuccess();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-card-hover"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-charcoal-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1 text-charcoal-500 hover:bg-sand-50 hover:text-charcoal-900"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <Field label="Belge Adı" required>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
          />
        </Field>
        <Field label="Kod (özgün)" required>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={!!initial}
            placeholder="ör: driver_ehliyet"
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-mono focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500 disabled:bg-sand-50"
          />
        </Field>
        <Field label="Kategori">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
          >
            <option value="company">Şirket</option>
            <option value="vehicle">Araç</option>
            <option value="driver">Şoför</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sıra">
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
            />
          </Field>
          <div className="space-y-2 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              Zorunlu
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requiresExpiry}
                onChange={(e) => setRequiresExpiry(e.target.checked)}
              />
              Son kul. tarihi girilsin
            </label>
          </div>
        </div>
        <Field label="Açıklama">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Kaydediliyor…' : initial ? 'Kaydet' : 'Ekle'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        'relative h-6 w-11 rounded-full transition ' +
        (checked ? 'bg-sunset-500' : 'bg-charcoal-300')
      }
      aria-pressed={checked}
    >
      <span
        className={
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ' +
          (checked ? 'left-5' : 'left-0.5')
        }
      />
    </button>
  );
}
