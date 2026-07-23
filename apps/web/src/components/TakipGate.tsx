'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { providerSession } from '@/lib/session';
import { Button } from './ui';

export function TakipGate({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const token = providerSession.get();
    if (!token) return;
    apiGet<{ active: boolean }>('/me/subscription/takip', token)
      .then((r) => setActive(r.active))
      .catch((e) => setError((e as Error).message));
  }, []);

  async function request() {
    const token = providerSession.get();
    if (!token) return;
    setRequesting(true);
    try {
      await apiPost('/me/subscription/takip/interest', {}, token);
      setRequested(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRequesting(false);
    }
  }

  if (active === null && !error) {
    return <div className="text-charcoal-500">Yükleniyor…</div>;
  }
  if (active) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="relative bg-gradient-to-br from-charcoal-900 to-deepsea-900 p-8 text-white md:p-12">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sunset-500/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sunset-300">
              Takip Paketi
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
              Öğrencilerinizi ve ödemelerinizi
              <br />
              tek panelden yönetin.
            </h1>
            <p className="mt-4 max-w-2xl text-charcoal-300">
              Kağıt kalemle takibi bırakın. Kazandığınız her öğrencinin ödemesi,
              velisiyle iletişim, aylık tahsilat planı otomatik oluşturulur.
              Veli dekontu doğrudan panelden yükler, siz onaylarsınız.
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <Feature
            title="Öğrenci CRM"
            desc="Kazandığınız her öğrenci otomatik listenize düşer. Veli iletişimi, araç, sınıf, notlar tek yerde."
          />
          <Feature
            title="Aylık Ödeme Planı"
            desc="Her ay için otomatik ödeme satırı oluşur. Son ödeme tarihi geçince otomatik gecikmiş işaretlenir."
          />
          <Feature
            title="Dekont Onayı"
            desc="Veli panelinden dekontu yükler. Siz onaylar veya red gerekçesiyle geri gönderirsiniz."
          />
          <Feature
            title="Tahsilat Raporu"
            desc="Bu ay ne kadar tahsilat, ne kadar gecikmiş — tek bakışta özet."
          />
        </div>

        <div className="border-t border-charcoal-100 bg-sand-50 p-6">
          {requested ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              ✓ İlgi bildiriminiz alındı. Ekibimiz sizinle iletişime geçecek.
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-charcoal-700">
                Takip Paketi'ne yükseltmek için ekibimizle iletişime geçin.
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://wa.me/904523000000?text=Bindi%20Takip%20Paketi%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                >
                  💬 WhatsApp
                </a>
                <Button onClick={request} disabled={requesting}>
                  {requesting ? 'Gönderiliyor…' : 'İlgileniyorum'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-charcoal-100 bg-white p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sunset-100 text-sunset-700">
        ✓
      </div>
      <div className="mt-3 text-sm font-bold text-charcoal-900">{title}</div>
      <p className="mt-1 text-xs text-charcoal-600">{desc}</p>
    </div>
  );
}
