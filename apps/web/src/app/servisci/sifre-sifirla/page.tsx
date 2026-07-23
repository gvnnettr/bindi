'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { Button, Field, Input } from '@/components/ui';
import { PhoneInput, toBackendPhone } from '@/components/PhoneInput';
import { PinInput } from '@/components/PinInput';
import { AuthLayout } from '@/components/AuthLayout';

export default function ProviderForgotPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'reset'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const backendPhone = toBackendPhone(phone);

  async function sendCode() {
    if (phone.length !== 10) { setError('10 haneli telefon numaranı gir'); return; }
    setError(null);
    setLoading(true);
    try {
      await apiPost('/providers/forgot-password', { phone: backendPhone });
      setStep('reset');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    if (newPassword.length !== 6) { setError('Yeni şifre 6 rakam olmalı'); return; }
    setError(null);
    setLoading(true);
    try {
      await apiPost('/providers/reset-password', {
        phone: backendPhone,
        code,
        newPassword,
      });
      alert('Şifreniz güncellendi. Giriş yapabilirsiniz.');
      router.push('/servisci/giris');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Şifremi Unuttum"
      subtitle={
        step === 'phone'
          ? 'Kayıtlı telefonunuza SMS kodu göndereceğiz.'
          : 'SMS kodunu girin ve 6 rakamlı yeni şifreyi belirleyin.'
      }
      side="provider"
    >
      <div className="space-y-4 rounded-2xl border border-charcoal-100 bg-white p-6 shadow-card">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {step === 'phone' ? (
          <>
            <Field label="Telefon">
              <PhoneInput value={phone} onChange={setPhone} />
            </Field>
            <Button className="w-full" disabled={loading || phone.length !== 10} onClick={sendCode}>
              SMS Gönder
            </Button>
          </>
        ) : (
          <>
            <Field label="SMS Kodu">
              <Input
                maxLength={6}
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 haneli"
              />
            </Field>
            <Field label="Yeni Şifre (6 rakam)">
              <PinInput value={newPassword} onChange={setNewPassword} length={6} />
            </Field>
            <Button
              className="w-full"
              disabled={loading || code.length !== 6 || newPassword.length !== 6}
              onClick={reset}
            >
              Şifreyi Güncelle
            </Button>
          </>
        )}
      </div>
      <div className="mt-4 text-center text-sm">
        <Link href="/servisci/giris" className="text-charcoal-500 hover:text-charcoal-900">
          ← Girişe dön
        </Link>
      </div>
    </AuthLayout>
  );
}
