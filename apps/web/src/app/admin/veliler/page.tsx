'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { adminSession } from '@/lib/session';
import { Button, Field, Input } from '@/components/ui';

interface ParentRow {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  createdAt: string;
  hasPassword: boolean;
  studentCount: number;
  requestCount: number;
}

export default function AdminParentsPage() {
  const [rows, setRows] = useState<ParentRow[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    const token = adminSession.get();
    if (!token) return;
    try {
      const q = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
      const r = await apiGet<ParentRow[]>(`/admin/parents${q}`, token);
      setRows(r);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">Veliler</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Toplam {rows.length} veli · destek amacıyla her işlemi admin yapabilir
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Yeni Veli</Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Ad, telefon veya e-posta ara..."
          />
        </div>
        <Button variant="secondary" onClick={load}>Ara</Button>
      </div>

      {error && (
        <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-charcoal-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-charcoal-50 text-xs uppercase text-charcoal-500">
            <tr>
              <th className="px-4 py-3 text-left">Veli</th>
              <th className="px-4 py-3 text-left">Telefon</th>
              <th className="px-4 py-3 text-left">Öğrenci</th>
              <th className="px-4 py-3 text-left">Talep</th>
              <th className="px-4 py-3 text-left">Şifre</th>
              <th className="px-4 py-3 text-left">Kayıt</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-charcoal-400">Kayıt yok</td></tr>
            ) : rows.map((p) => (
              <tr key={p.id} className="border-t border-charcoal-100">
                <td className="px-4 py-3">
                  <div className="font-bold text-charcoal-900">{p.name}</div>
                  {p.email && <div className="text-xs text-charcoal-500">{p.email}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{p.phone}</td>
                <td className="px-4 py-3">{p.studentCount}</td>
                <td className="px-4 py-3">{p.requestCount}</td>
                <td className="px-4 py-3">
                  {p.hasPassword ? (
                    <span className="text-green-700">✓</span>
                  ) : (
                    <span className="text-amber-700">— OTP ile</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-charcoal-500">
                  {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/veliler/${p.id}`}
                    className="text-sunset-600 font-bold hover:underline"
                  >
                    Detay →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <NewParentModal onClose={() => setShowModal(false)} onDone={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}

function NewParentModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ generatedPassword: string; name: string; phone: string } | null>(null);

  async function submit() {
    if (!phone.trim() || !name.trim()) { setError('Telefon ve ad zorunlu'); return; }
    setLoading(true);
    setError(null);
    try {
      const token = adminSession.get();
      if (!token) throw new Error('Oturum yok');
      const r = await apiPost<any>('/admin/parents', {
        phone: phone.trim(),
        name: name.trim(),
        email: email.trim() || undefined,
      }, token);
      setResult({ generatedPassword: r.generatedPassword, name: r.name, phone: r.phone });
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
            <h2 className="text-xl font-bold mt-2">Veli oluşturuldu</h2>
            <p className="text-sm text-charcoal-500 mt-1">{result.name}</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="text-xs font-bold text-amber-900 uppercase">Otomatik PIN</div>
            <div className="text-3xl font-mono font-bold text-charcoal-900 tracking-widest mt-1">
              {result.generatedPassword}
            </div>
            <div className="text-xs text-amber-800 mt-2">
              📱 Bu PIN {result.phone} numarasına SMS ile gönderildi.
              Veli uygulamada bu PIN ile giriş yapıp değiştirmesi istenecek.
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
          <h2 className="text-xl font-bold text-charcoal-900">Yeni Veli Ekle</h2>
          <button onClick={onClose} className="text-charcoal-400 text-xl">✕</button>
        </div>
        {error && (
          <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
        )}
        <Field label="Telefon *">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XX XXX XX XX" />
        </Field>
        <Field label="Ad Soyad *">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ör: Ayşe Yılmaz" />
        </Field>
        <Field label="E-posta">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" />
        </Field>
        <div className="text-xs text-charcoal-500 border-t border-charcoal-100 pt-3">
          Otomatik 6 rakamlı PIN oluşturulup telefonuna SMS ile gönderilir. Veli
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
