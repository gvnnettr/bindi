'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button, Field, Input } from '@/components/ui';

interface Provider {
  id: string;
  phone: string;
  companyName: string;
  ownerName: string;
  status: string;
  createdAt: string;
  subscriptions: Array<{
    packageCode: string;
    receiptUrl: string | null;
    approvedAt: string | null;
  }>;
}

export default function AdminProvidersPage() {
  const [pending, setPending] = useState<Provider[]>([]);
  const [all, setAll] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  async function load() {
    const token = adminSession.get();
    if (!token) return;
    try {
      const [p, a] = await Promise.all([
        apiGet<Provider[]>('/admin/providers/pending', token),
        apiGet<Provider[]>('/admin/providers', token),
      ]);
      setPending(p);
      setAll(a);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    const months = Number(prompt('Kaç ay aktif olsun?', '12'));
    if (!months || months < 1) return;
    const token = adminSession.get();
    if (!token) return;
    try {
      await apiPost(`/admin/providers/${id}/approve`, { months }, token);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const [showNewModal, setShowNewModal] = useState(false);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 border-b border-charcoal-200 flex-1">
          <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
            Onay Bekleyenler
            {pending.length > 0 && (
              <span className="ml-2 rounded-full bg-sunset-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </TabButton>
          <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
            Tümü ({all.length})
          </TabButton>
        </div>
        <Button onClick={() => setShowNewModal(true)}>+ Yeni Servisçi</Button>
      </div>

      {showNewModal && (
        <NewProviderModal onClose={() => setShowNewModal(false)} onDone={() => { setShowNewModal(false); load(); }} />
      )}

      {tab === 'pending' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {pending.map((p) => (
            <div key={p.id} className="card p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-charcoal-900 text-white font-black">
                  {p.companyName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-charcoal-900">{p.companyName}</div>
                  <div className="text-sm text-charcoal-600">
                    {p.ownerName} — {p.phone}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {p.subscriptions.map((s, i) => (
                      <span key={i} className="badge-info">
                        {s.packageCode}
                      </span>
                    ))}
                    {p.subscriptions[0]?.receiptUrl ? (
                      <a
                        href={p.subscriptions[0].receiptUrl}
                        target="_blank"
                        className="text-sunset-600 hover:text-sunset-700 underline"
                      >
                        Dekont
                      </a>
                    ) : (
                      <span className="text-charcoal-400">Dekont yok</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={() => approve(p.id)}>
                  Onayla
                </Button>
                <Link
                  href={`/admin/servisciler/${p.id}`}
                  className="inline-flex items-center rounded-lg border border-charcoal-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal-900 transition hover:bg-sand-50"
                >
                  Detay
                </Link>
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-charcoal-200 bg-white p-12 text-center text-sm text-charcoal-500">
              🎉 Bekleyen başvuru yok, hepsi güncel.
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-charcoal-100 bg-sand-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
              <tr>
                <th className="px-6 py-3">Firma</th>
                <th className="px-6 py-3">Yetkili</th>
                <th className="px-6 py-3">Telefon</th>
                <th className="px-6 py-3">Durum</th>
                <th className="px-6 py-3">Kayıt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100">
              {all.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => (window.location.href = `/admin/servisciler/${p.id}`)}
                  className="cursor-pointer hover:bg-sand-50/50"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-charcoal-900">{p.companyName}</div>
                  </td>
                  <td className="px-6 py-4 text-charcoal-700">{p.ownerName}</td>
                  <td className="px-6 py-4 text-charcoal-700">{p.phone}</td>
                  <td className="px-6 py-4">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-6 py-4 text-charcoal-500">
                    {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
              {all.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-charcoal-500">
                    Kayıtlı servisçi yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'relative -mb-px flex items-center px-4 py-2.5 text-sm font-semibold transition ' +
        (active
          ? 'border-b-2 border-sunset-500 text-charcoal-900'
          : 'border-b-2 border-transparent text-charcoal-500 hover:text-charcoal-900')
      }
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    active: { cls: 'badge-success', label: 'Aktif' },
    pending_approval: { cls: 'badge-warning', label: 'Onay Bekliyor' },
    pending_payment: { cls: 'badge-neutral', label: 'Ödeme Bekliyor' },
    suspended: { cls: 'badge-neutral', label: 'Askıda' },
  };
  const m = map[status] ?? { cls: 'badge-neutral', label: status };
  return <span className={m.cls}>{m.label}</span>;
}

function NewProviderModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'pending_approval' | 'active'>('pending_approval');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ generatedPassword: string; companyName: string; phone: string } | null>(null);

  async function submit() {
    if (!phone.trim() || !companyName.trim() || !ownerName.trim()) {
      setError('Telefon, firma adı ve sahip adı zorunlu'); return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = adminSession.get();
      if (!token) throw new Error('Oturum yok');
      const r = await apiPost<any>('/admin/providers', {
        phone: phone.trim(),
        companyName: companyName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim() || undefined,
        status,
      }, token);
      setResult({ generatedPassword: r.generatedPassword, companyName: r.companyName, phone: r.phone });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-bold mt-2">Servisçi oluşturuldu</h2>
            <p className="text-sm text-charcoal-500 mt-1">{result.companyName}</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="text-xs font-bold text-amber-900 uppercase">Otomatik PIN</div>
            <div className="text-3xl font-mono font-bold text-charcoal-900 tracking-widest mt-1">
              {result.generatedPassword}
            </div>
            <div className="text-xs text-amber-800 mt-2">
              📱 Bu PIN {result.phone} numarasına SMS ile gönderildi.
              Servisçi ilk girişte kendi PIN'ini belirleyecek.
            </div>
          </div>
          <Button onClick={onDone} className="w-full">Tamam</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-charcoal-900">Yeni Servisçi Ekle</h2>
          <button onClick={onClose} className="text-charcoal-400 text-xl">✕</button>
        </div>
        {error && (
          <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
        )}
        <Field label="Telefon *">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XX XXX XX XX" />
        </Field>
        <Field label="Firma Adı *">
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Örn: Yıldız Servis Ltd." />
        </Field>
        <Field label="Sahip Adı *">
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Örn: Ali Yıldız" />
        </Field>
        <Field label="E-posta">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="firma@mail.com" />
        </Field>
        <Field label="Durum">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white"
          >
            <option value="pending_approval">Onay Bekliyor (belge yüklenmesini bekle)</option>
            <option value="active">Direkt Aktif (belge zorunlu değil)</option>
          </select>
        </Field>
        <div className="text-xs text-charcoal-500 border-t border-charcoal-100 pt-3">
          Otomatik 6 rakamlı PIN oluşturulup telefonuna SMS ile gönderilir. Servisçi
          ilk girişte kendi PIN'ini belirleyebilir.
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Vazgeç</Button>
          <Button onClick={submit} disabled={loading} className="flex-1">
            {loading ? 'Oluşturuluyor...' : 'Oluştur & SMS Gönder'}
          </Button>
        </div>
      </div>
    </div>
  );
}
