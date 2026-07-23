'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { Button, Field, Input } from '@/components/ui';
import { adminSession } from '@/lib/session';
import { AuthLayout } from '@/components/AuthLayout';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    setError(null);
    try {
      const r = await apiPost<{ token: string }>('/admin/auth/login', {
        email,
        password,
      });
      adminSession.set(r.token);
      router.push('/admin');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Admin Girişi"
      subtitle="Yönetim paneline erişmek için giriş yapın."
      side="admin"
    >
      <div className="space-y-4 rounded-2xl border border-charcoal-100 bg-white p-6 shadow-card">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Field label="E-posta">
          <Input
            type="email"
            placeholder="admin@servis.gvn.net.tr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Şifre">
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button
          className="w-full"
          disabled={loading || !email || !password}
          onClick={login}
        >
          Giriş Yap
        </Button>
      </div>
    </AuthLayout>
  );
}
