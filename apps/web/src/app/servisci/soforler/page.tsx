'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { Button } from '@/components/ui';

interface Driver {
  id: string;
  name: string;
  phone: string;
  tcNo: string | null;
  licenseClass: string | null;
  active: boolean;
  note: string | null;
  createdAt: string;
  docsApproved: number;
  docsRequired: number;
  missingDocs: string[];
}

export default function SoforlerPage() {
  const [rows, setRows] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    const token = providerSession.get();
    if (!token) return;
    try {
      const r = await apiGet<Driver[]>('/me/drivers', token);
      setRows(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string, name: string) {
    if (!confirm(`${name} adlı şoförü silmek istediğinize emin misiniz?`))
      return;
    const token = providerSession.get();
    if (!token) return;
    try {
      await apiDelete(`/me/drivers/${id}`, token);
      setNotice('Şoför silindi.');
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-charcoal-900">Şoförler</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Servis araçlarınızda görev yapan şoförleri buradan yönetin. Her şoför
            için zorunlu belgeleri yükleyin — admin onayı sonrası aktifleşir.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Yeni Şoför</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((d) => {
          const docsOk = d.docsApproved === d.docsRequired;
          return (
            <div
              key={d.id}
              className={
                'card p-5 ' +
                (docsOk
                  ? ''
                  : 'border-amber-200 bg-amber-50/30')
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-base font-bold text-charcoal-900">
                      {d.name}
                    </div>
                    {!d.active && (
                      <span className="badge-neutral">Pasif</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-charcoal-500">
                    {d.phone}
                    {d.licenseClass && ` · Ehliyet: ${d.licenseClass}`}
                  </div>
                </div>
                <div className="text-3xl">👤</div>
              </div>

              <div className="mt-4 rounded-md border border-charcoal-100 bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                  Belge Durumu
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <div className="text-xl font-black text-charcoal-900">
                    {d.docsApproved}/{d.docsRequired}
                  </div>
                  <div className="text-xs text-charcoal-500">onaylı</div>
                </div>
                {d.missingDocs.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 text-[11px] text-amber-700">
                    {d.missingDocs.slice(0, 3).map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                    {d.missingDocs.length > 3 && (
                      <li>+{d.missingDocs.length - 3} daha</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/servisci/soforler/${d.id}`}
                  className="flex-1 rounded-md bg-charcoal-900 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-charcoal-800"
                >
                  Detay & Belgeler
                </Link>
                <button
                  onClick={() => remove(d.id, d.name)}
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Sil
                </button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-charcoal-200 bg-white p-12 text-center text-sm text-charcoal-500">
            Henüz şoför eklemediniz.
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            setNotice('Şoför eklendi.');
            setTimeout(() => setNotice(null), 2500);
            load();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function CreateModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [licenseClass, setLicenseClass] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = providerSession.get();
    if (!token) return;
    try {
      await apiPost(
        '/me/drivers',
        {
          name,
          phone,
          tcNo: tcNo || undefined,
          licenseClass: licenseClass || undefined,
          note: note || undefined,
        },
        token,
      );
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
        className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-card-hover"
      >
        <h3 className="text-lg font-bold text-charcoal-900">Yeni Şoför</h3>

        <Field label="Ad Soyad" required>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Telefon" required>
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05xx xxx xx xx"
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="TC Kimlik No">
            <input
              value={tcNo}
              onChange={(e) => setTcNo(e.target.value)}
              maxLength={11}
              className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Ehliyet Sınıfı">
            <input
              value={licenseClass}
              onChange={(e) => setLicenseClass(e.target.value)}
              placeholder="B / D / E"
              className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <Field label="Not (opsiyonel)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Ekleniyor…' : 'Ekle'}
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
