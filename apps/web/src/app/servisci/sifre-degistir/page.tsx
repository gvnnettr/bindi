'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { Button } from '@/components/ui';
import { PinInput } from '@/components/PinInput';

export default function SifreDegistirPage() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next1, setNext1] = useState('');
  const [next2, setNext2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next1.length !== 6) {
      setError('Yeni şifre 6 rakam olmalı');
      return;
    }
    if (next1 !== next2) {
      setError('Yeni şifreler eşleşmiyor');
      return;
    }
    const token = providerSession.get();
    if (!token) return;
    setLoading(true);
    try {
      await apiPost(
        '/me/password',
        { currentPassword: current, newPassword: next1 },
        token,
      );
      router.replace('/servisci');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sunset-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sunset-700">
          İlk Giriş
        </div>
        <h1 className="text-2xl font-black text-charcoal-900">
          Şifrenizi belirleyin
        </h1>
        <p className="mt-2 text-sm text-charcoal-600">
          Güvenliğiniz için SMS ile gelen 6 rakamlı geçici şifreyi hemen
          değiştirmeniz gerekiyor. Yeni şifre de 6 rakamdan oluşmalıdır.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500">
              Mevcut Şifre (SMS ile gelen 6 rakamlı)
            </label>
            <PinInput value={current} onChange={setCurrent} length={6} autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500">
              Yeni Şifre (6 rakam)
            </label>
            <PinInput value={next1} onChange={setNext1} length={6} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500">
              Yeni Şifre (Tekrar)
            </label>
            <PinInput value={next2} onChange={setNext2} length={6} />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? 'Kaydediliyor…' : 'Şifreyi Değiştir'}
          </Button>
        </form>
      </div>
    </div>
  );
}
