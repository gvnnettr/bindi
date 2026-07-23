'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { Button, Field } from '@/components/ui';
import { PhoneInput, toBackendPhone } from '@/components/PhoneInput';
import { PinInput } from '@/components/PinInput';
import { providerSession } from '@/lib/session';
import { AuthLayout } from '@/components/AuthLayout';

export default function ProviderLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login() {
    if (phone.length !== 10) { setError('10 haneli telefon numaranı gir'); return; }
    if (password.length !== 6) { setError('6 rakamlı şifreni gir'); return; }
    setError(null);
    setLoading(true);
    try {
      const r = await apiPost<{
        token: string;
        providerId: string;
        mustChangePassword?: boolean;
      }>('/providers/login', { phone: toBackendPhone(phone), password });
      providerSession.set(r.token);
      if (r.mustChangePassword) {
        router.push('/servisci/sifre-degistir');
      } else {
        router.push('/servisci');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Servisçi Girişi"
      subtitle="Kayıtlı telefonunuz ve 6 rakamlı şifrenizle giriş yapın."
      side="provider"
    >
      <div className="space-y-4 rounded-2xl border border-charcoal-100 bg-white p-6 shadow-card">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Field label="Telefon">
          <PhoneInput value={phone} onChange={setPhone} />
        </Field>
        <Field label="Şifre (6 rakam)">
          <PinInput value={password} onChange={setPassword} length={6} />
        </Field>
        <Button
          className="w-full"
          disabled={loading || phone.length !== 10 || password.length !== 6}
          onClick={login}
        >
          Giriş Yap
        </Button>
      </div>
      <div className="mt-4 text-center text-sm text-charcoal-600">
        <Link href="/servisci/sifre-sifirla" className="text-charcoal-500 hover:text-charcoal-900">
          Şifremi unuttum
        </Link>
      </div>
      <div className="mt-2 text-center text-sm text-charcoal-600">
        Servisçi değil misiniz?{' '}
        <Link href="/servisci/kayit" className="font-semibold text-sunset-600 hover:text-sunset-700">
          Ücretsiz kayıt olun
        </Link>
      </div>
    </AuthLayout>
  );
}
