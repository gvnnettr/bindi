'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiGet, apiPost } from '@/lib/api';
import { parentSession } from '@/lib/session';
import { Button, Field, Input } from '@/components/ui';

type Tab = 'profil' | 'telefon' | 'sifre';

interface Me {
  name: string;
  phone: string;
  email: string | null;
  hasPassword: boolean;
}

export default function ParentSettingsPage() {
  const [tab, setTab] = useState<Tab>('profil');
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const token = parentSession.get();
    if (!token) return;
    try {
      const data = await apiGet<Me>('/me/parent', token);
      setMe(data);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function say(msg: string) {
    setNotice(msg);
    setError(null);
    setTimeout(() => setNotice(null), 2500);
  }
  function fail(msg: string) {
    setError(msg);
    setNotice(null);
  }

  if (!me) return <div className="text-charcoal-500">Yükleniyor…</div>;

  return (
    <div className="max-w-2xl space-y-6">
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

      <div className="flex flex-wrap gap-2 border-b border-charcoal-200">
        <TabBtn active={tab === 'profil'} onClick={() => setTab('profil')}>
          Profil
        </TabBtn>
        <TabBtn active={tab === 'telefon'} onClick={() => setTab('telefon')}>
          Telefon Değiştir
        </TabBtn>
        <TabBtn active={tab === 'sifre'} onClick={() => setTab('sifre')}>
          Şifre
        </TabBtn>
      </div>

      {tab === 'profil' && <Profil me={me} onOk={(m) => { setMe(m); say('Bilgiler güncellendi.'); }} onErr={fail} />}
      {tab === 'telefon' && <Telefon me={me} onOk={() => { load(); say('Telefon güncellendi.'); }} onErr={fail} />}
      {tab === 'sifre' && <Sifre onOk={say} onErr={fail} />}
    </div>
  );
}

function Profil({ me, onOk, onErr }: { me: Me; onOk: (m: Me) => void; onErr: (s: string) => void }) {
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email ?? '');
  const [loading, setLoading] = useState(false);

  async function save() {
    const token = parentSession.get();
    if (!token) return;
    setLoading(true);
    try {
      await apiFetch('/me/parent', {
        method: 'PATCH',
        body: JSON.stringify({ name, email }),
        headers: { Authorization: `Bearer ${token}` },
      });
      onOk({ ...me, name, email });
    } catch (e) {
      onErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-lg font-bold text-charcoal-900">Profil Bilgileri</h2>
      <Field label="Ad Soyad">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Telefon" hint="Telefon değiştirmek için ilgili sekmeyi kullanın.">
        <Input value={me.phone} disabled />
      </Field>
      <Field label="E-posta (opsiyonel)">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button disabled={loading || !name} onClick={save}>
        Kaydet
      </Button>
    </div>
  );
}

function Telefon({ me, onOk, onErr }: { me: Me; onOk: () => void; onErr: (s: string) => void }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    const token = parentSession.get();
    if (!token) return;
    setLoading(true);
    try {
      await apiPost('/me/parent/phone/request', { newPhone }, token);
      setStep('code');
    } catch (e) {
      onErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function verify() {
    const token = parentSession.get();
    if (!token) return;
    setLoading(true);
    try {
      await apiPost('/me/parent/phone/verify', { newPhone, code }, token);
      setStep('phone');
      setNewPhone('');
      setCode('');
      onOk();
    } catch (e) {
      onErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-lg font-bold text-charcoal-900">Telefon Değiştir</h2>
      <div className="rounded-lg bg-sand-50 p-3 text-xs text-charcoal-600">
        Mevcut: <span className="font-semibold">{me.phone}</span>
      </div>
      {step === 'phone' ? (
        <>
          <Field label="Yeni Telefon">
            <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="05xx xxx xx xx" />
          </Field>
          <Button disabled={loading || !newPhone} onClick={sendCode}>
            SMS Gönder
          </Button>
        </>
      ) : (
        <>
          <Field label="SMS Kodu" hint={`${newPhone} numarasına gelen 6 haneli kodu girin`}>
            <Input maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('phone')}>
              Geri
            </Button>
            <Button disabled={loading || code.length !== 6} onClick={verify}>
              Onayla
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Sifre({ onOk, onErr }: { onOk: (s: string) => void; onErr: (s: string) => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (pw !== pw2) return onErr('Şifreler eşleşmiyor');
    if (!/^\d{6}$/.test(pw)) return onErr('Şifre 6 rakam olmalı');
    const token = parentSession.get();
    if (!token) return;
    setLoading(true);
    try {
      await apiPost('/me/parent/password', { password: pw }, token);
      setPw('');
      setPw2('');
      onOk('Şifre güncellendi.');
    } catch (e) {
      onErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-lg font-bold text-charcoal-900">Şifre Belirle / Değiştir</h2>
      <Field label="Yeni Şifre (6 rakam)">
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pw}
          onChange={(e) => setPw(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
        />
      </Field>
      <Field label="Yeni Şifre (Tekrar)">
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pw2}
          onChange={(e) => setPw2(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
        />
      </Field>
      <Button disabled={loading || pw.length !== 6 || pw !== pw2} onClick={save}>
        Şifreyi Güncelle
      </Button>
    </div>
  );
}

function TabBtn({
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
        'relative -mb-px px-4 py-2.5 text-sm font-semibold transition ' +
        (active
          ? 'border-b-2 border-sunset-500 text-charcoal-900'
          : 'border-b-2 border-transparent text-charcoal-500 hover:text-charcoal-900')
      }
    >
      {children}
    </button>
  );
}
