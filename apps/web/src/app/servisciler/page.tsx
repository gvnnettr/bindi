'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { apiGet } from '@/lib/api';

export default function ServicilerPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <SiteHeader />
      <Hero />
      <Benefits />
      <HowToJoin />
      <PackagesTeaser />
      <ProviderTestimonials />
      <FAQ />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function ArrowRight() {
  return (
    <svg className="ml-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-charcoal-900 text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-96 w-[900px] -translate-x-1/2 rounded-full bg-sunset-500/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-deepsea-500/20 blur-3xl" />
      </div>
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-sunset-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sunset-500" />
              Servisçilere Özel Portal
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
              Yeni veliler{' '}
              <span className="text-sunset-400">sizi arıyor.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal-300">
              Bölgenizdeki veli talepleri doğrudan telefonunuza düşsün. Aylık
              sabit abonelik, teklif başına komisyon yok. Kazandığınız her
              öğrenci %100 sizin.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/servisci/kayit" className="btn-primary text-base px-6 py-3.5">
                Ücretsiz Kayıt Ol
                <ArrowRight />
              </Link>
              <Link
                href="/servisci/giris"
                className="btn text-base px-6 py-3.5 bg-white/10 text-white border border-white/20 hover:bg-white/20"
              >
                Servisçi Girişi
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6">
              <MiniStat value="180+" label="Aktif Servisçi" />
              <MiniStat value="₺0" label="Komisyon" />
              <MiniStat value="7 gün" label="İçinde Onay" />
            </div>
          </div>
          <div className="relative">
            <ProviderPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-charcoal-400">{label}</div>
    </div>
  );
}

function ProviderPreview() {
  return (
    <div className="rounded-2xl bg-charcoal-800 p-2 shadow-card-hover ring-1 ring-white/10">
      <div className="rounded-xl bg-white p-6 text-charcoal-900">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-charcoal-500">Bugünkü Talepler</div>
          <span className="badge-accent">12 yeni</span>
        </div>
        <div className="mt-4 space-y-3">
          {[
            { area: 'Altınordu · Şahincili', school: 'Cumhuriyet İlkokulu', new: true },
            { area: 'Altınordu · Karşıyaka', school: 'Özel Ordu Koleji', new: true },
            { area: 'Ünye · Merkez', school: 'Atatürk İlkokulu', new: false },
            { area: 'Fatsa · Yalıköy', school: 'Yavuz Selim Ortaokulu', new: true },
          ].map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-charcoal-100 bg-sand-50 p-3"
            >
              <div>
                <div className="text-sm font-semibold text-charcoal-900">{r.area}</div>
                <div className="text-xs text-charcoal-500">{r.school}</div>
              </div>
              {r.new ? (
                <span className="badge-warning">Yeni</span>
              ) : (
                <span className="badge-neutral">Teklif verildi</span>
              )}
            </div>
          ))}
        </div>
        <button className="btn-primary mt-4 w-full">Tümünü Gör</button>
      </div>
    </div>
  );
}

function Benefits() {
  const items = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
      title: 'Komisyon Yok',
      desc: 'Sadece aylık sabit abonelik ödersiniz. Kazandığınız her öğrenci ücretinden bir kuruş bile kesilmez.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        </svg>
      ),
      title: 'Bölgeye Göre Talep',
      desc: 'Sadece hizmet verdiğiniz okul ve mahallelerdeki talepler size düşer. Alakasız işlerle vakit kaybetmezsiniz.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 8L12 14 2 8" />
        </svg>
      ),
      title: 'Anlık Bildirim',
      desc: 'Yeni talep geldiğinde SMS ve e-posta ile anında haberdar olun. Fırsatları rakiplerinizden önce yakalayın.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
        </svg>
      ),
      title: 'Güvenilir Marka',
      desc: 'Onaylı servisçi rozeti + veli puan sistemi. Doğru fiyatı verdiğinizde işleri kazanırsınız, tavsiye ile büyürsünüz.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      title: 'Araç & Belge Yönetimi',
      desc: 'Ruhsat, muayene, sigorta, K belgesi — hepsi tek panelde. Süresi dolmadan otomatik uyarı.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 010 8h-1" />
          <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      ),
      title: 'Aile CRM (Yakında)',
      desc: 'Kazandığınız öğrencileri, velileri, aylık ödemeleri tek yerden yönetin. Ek yazılım gerekmez.',
    },
  ];
  return (
    <section id="neden" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center rounded-full bg-sunset-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sunset-700">
            Neden Servis Platform?
          </div>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-charcoal-900 md:text-5xl">
            Servisçiler için tasarlandı.
          </h2>
          <p className="mt-4 text-lg text-charcoal-600">
            Kâğıt kalemle takip, WhatsApp'ta müzakere, komşu tavsiyesiyle iş
            bulma dönemi bitti. Tek yerden hem işi hem operasyonu yönetin.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="card p-6 transition hover:shadow-card-hover">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sunset-100 to-sunset-200 text-sunset-700">
                <span className="block h-6 w-6">{it.icon}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-charcoal-900">
                {it.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
                {it.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowToJoin() {
  const steps = [
    {
      n: '01',
      title: 'Ücretsiz Kayıt',
      desc: 'Telefonunuza SMS ile doğrulama, firma bilgilerinizi girin. 5 dakika sürüyor.',
    },
    {
      n: '02',
      title: 'Bölge & Okul Seçin',
      desc: 'Hizmet verdiğiniz okulları ve mahalleleri belirtin. Sadece uygun talepler size düşer.',
    },
    {
      n: '03',
      title: 'Paketi Seçin, Ödeyin',
      desc: 'Havale/EFT ile aylık aboneliğinizi başlatın. Dekontu yükleyin, 24 saat içinde onay.',
    },
    {
      n: '04',
      title: 'Teklif Vermeye Başlayın',
      desc: 'Onay sonrası panelinize düşen taleplere teklif verin. Veli seçtiğinde iletişim açılır.',
    },
  ];
  return (
    <section id="nasil" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center rounded-full bg-sunset-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sunset-700">
            Nasıl Katılırım
          </div>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-charcoal-900 md:text-5xl">
            4 adımda sisteme dahil olun.
          </h2>
          <p className="mt-4 text-lg text-charcoal-600">
            İlk günden itibaren bölgenizdeki veli taleplerine ulaşabilirsiniz.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="card p-6 transition hover:shadow-card-hover">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-charcoal-900 text-white">
                  <span className="text-sm font-black">{s.n}</span>
                </div>
                <span className="text-4xl font-black text-sand-200">{s.n}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-charcoal-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PACKAGE_META: Record<
  string,
  {
    tagline: string;
    badge: string;
    features: string[];
    cta: string;
    featured: boolean;
  }
> = {
  teklif: {
    tagline: 'Kazanç odaklı',
    badge: '',
    features: [
      'Bölgenizdeki tüm veli taleplerini görün',
      'Sınırsız teklif verme hakkı',
      'Araç ve firma bilgisi yönetimi',
      'Veli seçtiğinde otomatik bildirim',
      'Puan sistemine katılım',
    ],
    cta: 'Kayıt Ol',
    featured: true,
  },
  takip: {
    tagline: 'Yakında — operasyon modülü',
    badge: 'YAKINDA',
    features: [
      'Öğrenci / veli CRM',
      'Aylık ödeme takibi + dekont onay',
      'Araç belge takibi + otomatik hatırlatma',
      'POS entegrasyonu (opsiyonel)',
      'Aile / güzergâh planlama',
    ],
    cta: 'İlgileniyorum',
    featured: false,
  },
};

const DEFAULT_PACKAGES: Array<{ code: string; name: string; monthlyPrice: number }> = [
  { code: 'teklif', name: 'Teklif Paketi', monthlyPrice: 299 },
  { code: 'takip', name: 'Takip Paketi', monthlyPrice: 499 },
];

function PackagesTeaser() {
  const [rows, setRows] = useState(DEFAULT_PACKAGES);

  useEffect(() => {
    apiGet<Array<{ code: string; name: string; monthlyPrice: number }>>(
      '/public-packages',
    )
      .then((data) => {
        if (data.length > 0) setRows(data);
      })
      .catch(() => {
        // Sessize düş, default fiyatları göster
      });
  }, []);

  const packages = rows.map((r) => {
    const meta = PACKAGE_META[r.code] ?? {
      tagline: '',
      badge: '',
      features: [],
      cta: 'İncele',
      featured: false,
    };
    return {
      code: r.code,
      name: r.name,
      price: r.monthlyPrice.toLocaleString('tr-TR'),
      ...meta,
    };
  });
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-charcoal-700 shadow-sm">
            Paketler
          </div>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-charcoal-900 md:text-5xl">
            Şeffaf, sabit aylık abonelik.
          </h2>
          <p className="mt-4 text-lg text-charcoal-600">
            Kazandığınız işten kesinti yok. Sadece hizmet karşılığı ödersiniz.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {packages.map((p) => (
            <div
              key={p.code}
              className={
                'relative card p-8 ' +
                (p.featured ? 'ring-2 ring-sunset-500 shadow-card-hover' : '')
              }
            >
              {p.badge && (
                <span className="absolute -top-3 right-6 rounded-full bg-charcoal-900 px-3 py-1 text-xs font-bold text-white">
                  {p.badge}
                </span>
              )}
              <div className="text-xs font-semibold uppercase tracking-wider text-sunset-700">
                {p.tagline}
              </div>
              <h3 className="mt-2 text-2xl font-black text-charcoal-900">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-black text-charcoal-900">
                  ₺{p.price}
                </span>
                <span className="text-sm text-charcoal-500">/ ay</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-sunset-100 text-sunset-700">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-charcoal-700">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {p.featured ? (
                  <Link href="/servisci/kayit" className="btn-primary w-full justify-center">
                    {p.cta}
                    <ArrowRight />
                  </Link>
                ) : (
                  <Link href="/iletisim" className="btn-secondary w-full justify-center">
                    {p.cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-charcoal-500">
          Fiyatlar örnek gösterimdir. Güncel paket fiyatları kayıt sayfasında.
        </p>
      </div>
    </section>
  );
}

function ProviderTestimonials() {
  const items = [
    {
      quote:
        'Bölgemde 8 yeni müşteri kazandım. Talepler doğrudan telefonuma düşüyor, teklif verip bekliyorum. Kolay.',
      name: 'Barış Servis',
      role: 'Şoför & Firma Sahibi · Ordu',
      initials: 'BS',
      bg: 'bg-sunset-500',
    },
    {
      quote:
        'Belge takibini artık kağıtla tutmuyorum. Muayene tarihi yaklaşınca sistem SMS atıyor, rahatım.',
      name: 'Kadir Turizm',
      role: 'Filo Sahibi · Ünye',
      initials: 'KT',
      bg: 'bg-deepsea-500',
    },
    {
      quote:
        'Komisyon olmaması büyük fark. Aylık aboneliğim ilk kazandığım öğrenciyle geri döndü.',
      name: 'Emre Servis',
      role: 'Servisçi · Fatsa',
      initials: 'ES',
      bg: 'bg-charcoal-900',
    },
  ];
  return (
    <section className="bg-sand-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-charcoal-700 shadow-sm">
            Servisçi Yorumları
          </div>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-charcoal-900 md:text-5xl">
            Servisçiler ne diyor?
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((t) => (
            <div key={t.name} className="card p-8">
              <div className="mb-4 flex gap-1 text-sunset-500">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.156c.969 0 1.371 1.24.588 1.81l-3.362 2.445a1 1 0 00-.363 1.118l1.286 3.955c.3.921-.755 1.688-1.539 1.118l-3.362-2.445a1 1 0 00-1.175 0l-3.362 2.445c-.784.57-1.838-.197-1.539-1.118l1.286-3.955a1 1 0 00-.363-1.118L2.98 9.382c-.784-.57-.38-1.81.588-1.81h4.156a1 1 0 00.95-.69l1.286-3.955z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-charcoal-700">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white ${t.bg}`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-charcoal-900">{t.name}</div>
                  <div className="text-xs text-charcoal-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: 'Kayıt olmak ücretli mi?',
      a: 'Hayır. Kayıt tamamen ücretsiz. Aylık aboneliği yalnızca panelinizi kullanmaya başlamak için ödersiniz.',
    },
    {
      q: 'Sözleşme süresi var mı?',
      a: 'Yok. İstediğiniz zaman aboneliğinizi durdurabilirsiniz. Yıllık ödeyenlere avantajlı fiyat sunulur.',
    },
    {
      q: 'Aldığım işten komisyon veriyor muyum?',
      a: 'Kesinlikle hayır. Aldığınız her öğrenci ücreti %100 size aittir. Platform yalnızca aylık abonelikle gelir sağlar.',
    },
    {
      q: 'Vergi levhası olmadan kayıt olabilir miyim?',
      a: 'Hayır. Vergi levhası, K belgesi ve sigortalı çalışan servis şartı aranır. Bu güvenilirlik için önemlidir.',
    },
    {
      q: 'Kaç saatte onaylanır?',
      a: 'Dekont yüklendikten sonra genellikle aynı iş günü, en geç 24 saat içinde onaylanır.',
    },
    {
      q: 'İl / ilçe dışı taleplere de bakabilir miyim?',
      a: 'Evet. Kayıt sırasında birden fazla il, ilçe ve mahalleyi hizmet bölgeniz olarak ekleyebilirsiniz.',
    },
  ];
  return (
    <section id="sss" className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-charcoal-700 shadow-sm">
            Servisçilere Sık Sorulan Sorular
          </div>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-charcoal-900">
            Aklınıza takılanlar.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {items.map((it) => (
            <div key={it.q} className="card p-6">
              <h3 className="text-base font-bold text-charcoal-900">{it.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-600">{it.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-charcoal-900 p-12 text-center text-white shadow-card-hover md:p-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sunset-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-deepsea-500/20 blur-3xl" />
          <div className="relative">
            <h3 className="text-3xl font-extrabold tracking-tight md:text-5xl">
              Bugün başlayın.
            </h3>
            <p className="mx-auto mt-4 max-w-xl text-lg text-charcoal-300">
              5 dakikada kayıt olun, ilk gün taleplerinizi görmeye başlayın.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/servisci/kayit" className="btn-primary text-base px-8 py-3.5">
                Ücretsiz Kayıt Ol
                <ArrowRight />
              </Link>
              <Link
                href="/servisci/giris"
                className="btn text-base px-8 py-3.5 bg-white/10 text-white border border-white/20 hover:bg-white/20"
              >
                Servisçi Girişi
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
