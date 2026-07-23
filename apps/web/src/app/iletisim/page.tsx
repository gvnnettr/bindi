'use client';

import { useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Button } from '@/components/ui';
import { apiPost } from '@/lib/api';

export default function IletisimPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <SiteHeader />
      <main>
        <Header />
        <Content />
      </main>
      <SiteFooter />
    </div>
  );
}

function Header() {
  return (
    <section className="relative overflow-hidden bg-white py-16">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 right-1/4 h-64 w-96 rounded-full bg-sunset-100 blur-3xl opacity-70" />
        <div className="absolute left-0 top-20 h-64 w-64 rounded-full bg-deepsea-100 blur-3xl opacity-70" />
      </div>
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="inline-flex items-center rounded-full bg-sunset-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sunset-700">
          İletişim
        </div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-charcoal-900 md:text-5xl">
          Bize ulaşın.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-charcoal-600">
          Sorularınız, önerileriniz veya iş birliği için buradayız. Genellikle
          aynı iş gününde cevaplıyoruz.
        </p>
      </div>
    </section>
  );
}

function Content() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <ContactCard
              icon={
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              }
              title="Adres"
              body="Altınordu / Ordu"
            />
            <ContactCard
              icon={
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              }
              title="Telefon"
              body={
                <a href="tel:+904523000000" className="hover:text-sunset-600">
                  +90 452 300 00 00
                </a>
              }
            />
            <ContactCard
              icon={
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              }
              title="E-posta"
              body={
                <a
                  href="mailto:destek@servisplatform.com"
                  className="hover:text-sunset-600"
                >
                  destek@servisplatform.com
                </a>
              }
            />
            <ContactCard
              icon={
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              }
              title="Çalışma Saatleri"
              body={
                <>
                  Hafta içi: 09:00 – 18:00
                  <br />
                  Cumartesi: 10:00 – 15:00
                </>
              }
            />
            <div className="card overflow-hidden">
              <iframe
                title="Konum"
                src="https://maps.google.com/maps?q=Alt%C4%B1nordu%20Ordu&t=&z=13&ie=UTF8&iwloc=&output=embed"
                className="h-56 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-sunset-100 text-sunset-700">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {icon}
          </svg>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
            {title}
          </div>
          <div className="mt-1 text-sm font-medium text-charcoal-900">{body}</div>
        </div>
      </div>
    </div>
  );
}

function ContactForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      await apiPost('/contact', form);
      setStatus('success');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (e) {
      setStatus('error');
      setError((e as Error).message);
    }
  }

  if (status === 'success') {
    return (
      <div className="card flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-6 text-2xl font-bold text-charcoal-900">
          Mesajınız iletildi
        </h3>
        <p className="mt-2 max-w-sm text-sm text-charcoal-600">
          En kısa sürede size dönüş yapacağız. Genellikle aynı iş gününde
          yanıtlıyoruz.
        </p>
        <Button className="mt-6" onClick={() => setStatus('idle')}>
          Yeni Mesaj
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 md:p-8">
      <h3 className="text-xl font-bold text-charcoal-900">Bize yazın</h3>
      <p className="mt-1 text-sm text-charcoal-600">
        Aşağıdaki formu doldurun, size ulaşalım.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field
          label="Adınız Soyadınız"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          required
        />
        <Field
          label="E-posta"
          type="email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          required
        />
        <Field
          label="Telefon"
          type="tel"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
        />
        <Field
          label="Konu"
          value={form.subject}
          onChange={(v) => setForm({ ...form, subject: v })}
        />
      </div>
      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500">
          Mesajınız <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
          rows={6}
          className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
        />
      </div>
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-charcoal-500">
          Bilgileriniz üçüncü kişilerle paylaşılmaz.
        </p>
        <Button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Gönderiliyor...' : 'Gönder'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
      />
    </div>
  );
}
