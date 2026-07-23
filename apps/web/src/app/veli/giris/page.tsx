'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { Button, Field, Input } from '@/components/ui';
import { PhoneInput, toBackendPhone } from '@/components/PhoneInput';
import { PinInput } from '@/components/PinInput';
import { parentSession } from '@/lib/session';
import { AuthLayout } from '@/components/AuthLayout';

type Step = 'phone' | 'password' | 'otp' | 'set-password';

export default function ParentLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const backendPhone = toBackendPhone(phone);

  async function next() {
    if (phone.length !== 10) { setError('10 haneli telefon numaranı gir'); return; }
    setError(null);
    setLoading(true);
    try {
      const r = await apiPost<{ hasAccount: boolean; hasPassword: boolean }>(
        '/parents/login/check',
        { phone: backendPhone },
      );
      if (!r.hasAccount) {
        setError(
          'Bu telefonda kayıt bulunamadı. Önce anasayfadan "Teklif Al" ile talep gönderin.',
        );
        setLoading(false);
        return;
      }
      if (r.hasPassword) {
        setStep('password');
      } else {
        // İlk giriş: tek seferlik SMS ile şifre belirletme
        await apiPost('/parents/login/request', { phone: backendPhone });
        setStep('otp');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loginPassword() {
    if (password.length !== 6) { setError('6 rakamlı şifreni gir'); return; }
    setError(null);
    setLoading(true);
    try {
      const r = await apiPost<{ token: string }>('/parents/login/password', {
        phone: backendPhone,
        password,
      });
      parentSession.set(r.token);
      router.push('/veli');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loginOtp() {
    if (newPassword && newPassword.length !== 6) {
      setError('Yeni şifre 6 rakam olmalı');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const r = await apiPost<{ token: string }>('/parents/login/otp', {
        phone: backendPhone,
        code,
        newPassword: newPassword || undefined,
      });
      parentSession.set(r.token);
      router.push('/veli');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Veli Girişi"
      subtitle={
        step === 'phone'
          ? 'Telefonunuz ve şifrenizle giriş yapın.'
          : step === 'password'
            ? '6 rakamlı şifrenizle giriş yapın.'
            : 'SMS kodunu girin ve isterseniz şifre belirleyin.'
      }
      side="parent"
    >
      <div className="space-y-4 rounded-2xl border border-charcoal-100 bg-white p-6 shadow-card">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 'phone' && (
          <>
            <Field label="Telefon">
              <PhoneInput value={phone} onChange={setPhone} />
            </Field>
            <Button
              className="w-full"
              disabled={loading || phone.length !== 10}
              onClick={next}
            >
              Devam
            </Button>
          </>
        )}

        {step === 'password' && (
          <>
            <div className="rounded-lg bg-sand-50 p-3 text-xs text-charcoal-600">
              <span className="font-semibold">+90 {phone}</span>{' '}
              <button
                type="button"
                className="ml-2 text-sunset-600 hover:text-sunset-700"
                onClick={() => setStep('phone')}
              >
                değiştir
              </button>
            </div>
            <Field label="Şifre (6 rakam)">
              <PinInput value={password} onChange={setPassword} length={6} />
            </Field>
            <Button
              className="w-full"
              disabled={loading || password.length !== 6}
              onClick={loginPassword}
            >
              Giriş Yap
            </Button>
            <button
              className="w-full text-xs text-charcoal-500 hover:text-charcoal-900"
              onClick={async () => {
                setLoading(true);
                try {
                  await apiPost('/parents/login/request', { phone: backendPhone });
                  setStep('otp');
                } finally { setLoading(false); }
              }}
            >
              Şifremi unuttum — SMS ile giriş yap
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="rounded-lg bg-sand-50 p-3 text-xs text-charcoal-600">
              <span className="font-semibold">+90 {phone}</span> numarasına gelen kodu girin.
            </div>
            <Field label="SMS Kodu">
              <Input
                maxLength={6}
                inputMode="numeric"
                placeholder="6 haneli"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </Field>
            <Field
              label="Yeni Şifre (6 rakam · opsiyonel)"
              hint="Belirlerseniz sonraki girişleriniz şifre ile olur."
            >
              <PinInput value={newPassword} onChange={setNewPassword} length={6} />
            </Field>
            <Button
              className="w-full"
              disabled={loading || code.length !== 6}
              onClick={loginOtp}
            >
              Giriş Yap
            </Button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
