import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <SiteHeader />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-96 w-[900px] -translate-x-1/2 rounded-full bg-sunset-100 blur-3xl opacity-60" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-deepsea-100 blur-3xl opacity-70" />
      </div>
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sunset-200 bg-white px-3 py-1.5 text-xs font-semibold text-sunset-700 shadow-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sunset-500" />
              2026-2027 Eğitim Yılına Hazır
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-charcoal-900 md:text-6xl">
              Okul servisi bulmanın{' '}
              <span className="relative inline-block">
                <span className="relative z-10">en kolay</span>
                <span className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-sunset-200/70" />
              </span>{' '}
              yolu.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal-600">
              Talebinizi tek formla bırakın, bölgenizde okulunuza hizmet veren
              onaylı servisçiler size teklif versin. Fiyat, araç ve puana göre
              karşılaştırın, kendiniz seçin.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/teklif-al" className="btn-primary btn text-base px-6 py-3.5">
                Ücretsiz Teklif Al
                <ArrowRight />
              </Link>
              <a href="#nasil-calisir" className="btn-secondary btn text-base px-6 py-3.5">
                Nasıl Çalışır?
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-2">
                {[
                  { letters: 'ZA', bg: 'bg-sunset-500' },
                  { letters: 'MY', bg: 'bg-deepsea-500' },
                  { letters: 'AD', bg: 'bg-charcoal-900' },
                  { letters: 'EK', bg: 'bg-sunset-700' },
                ].map((a, i) => (
                  <div
                    key={i}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white ${a.bg}`}
                  >
                    {a.letters}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Stars />
                  <span className="text-sm font-semibold text-charcoal-900">4.8/5</span>
                </div>
                <div className="text-xs text-charcoal-600">
                  2.400+ velinin güvendiği platform
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-sunset-100/60 to-deepsea-100/60 blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl border border-charcoal-100 bg-white shadow-card-hover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-servis.png"
          alt="Okul servisi şoförü ve öğrenci"
          className="h-72 w-full object-cover md:h-[440px]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal-900/80 to-transparent p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-sunset-300">
            Öne Çıkan Servisçi
          </div>
          <div className="mt-1 text-lg font-bold text-white">Şahin Servis Turizm</div>
          <div className="mt-0.5 text-sm text-white/80">Ordu · Altınordu</div>
        </div>
      </div>
      <div className="absolute -bottom-8 -left-6 hidden w-64 rounded-2xl bg-white p-4 shadow-card-hover ring-1 ring-charcoal-100 md:block">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
            Aylık Ücret
          </div>
          <span className="badge-success">Onaylı</span>
        </div>
        <div className="mt-2 text-3xl font-black text-charcoal-900">
          2.850 <span className="text-lg text-charcoal-500">₺</span>
        </div>
        <div className="mt-1 text-xs text-charcoal-500">3 teklif karşılaştırıldı</div>
      </div>
      <div className="absolute -top-6 -right-4 hidden rounded-2xl bg-charcoal-900 p-4 text-white shadow-card-hover md:block">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sunset-500">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold">3 yeni teklif</div>
            <div className="text-xs text-charcoal-300">Son 24 saatte</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SchoolBusScene() {
  return (
    <svg viewBox="0 0 400 320" className="h-auto w-full">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF3EE" />
          <stop offset="100%" stopColor="#FDEDE4" />
        </linearGradient>
        <linearGradient id="busBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F19768" />
          <stop offset="100%" stopColor="#E07856" />
        </linearGradient>
        <linearGradient id="windowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1F3A4D" />
          <stop offset="100%" stopColor="#345774" />
        </linearGradient>
      </defs>

      {/* Sky panel */}
      <rect x="0" y="0" width="400" height="220" rx="20" fill="url(#sky)" />
      {/* Sun */}
      <circle cx="330" cy="70" r="28" fill="#FDCFB0" opacity="0.9" />
      <circle cx="330" cy="70" r="18" fill="#F19768" />

      {/* Distant hills */}
      <path d="M0 200 Q 80 150 160 180 T 320 175 T 400 190 L 400 220 L 0 220 Z" fill="#F5EDE3" />
      <path d="M0 210 Q 100 175 200 195 T 400 200 L 400 220 L 0 220 Z" fill="#F0E4D3" />

      {/* Road */}
      <rect x="0" y="220" width="400" height="60" fill="#2A2A2A" />
      <rect x="0" y="248" width="400" height="4" fill="#F5EDE3" opacity="0.4" strokeDasharray="24 16" />
      <g stroke="#F5EDE3" strokeWidth="4" strokeDasharray="24 16">
        <line x1="0" y1="250" x2="400" y2="250" />
      </g>

      {/* Bus */}
      <g transform="translate(60, 130)">
        {/* Body */}
        <rect x="0" y="20" width="220" height="80" rx="10" fill="url(#busBody)" />
        {/* Hood front */}
        <path d="M220 20 L 260 40 L 260 100 L 220 100 Z" fill="url(#busBody)" />
        <path d="M220 20 L 260 40 L 260 60 L 220 60 Z" fill="#FBBB99" />
        {/* Roof */}
        <rect x="0" y="14" width="220" height="10" rx="4" fill="#C25E3F" />
        {/* Windows */}
        <rect x="12" y="34" width="46" height="30" rx="4" fill="url(#windowGrad)" />
        <rect x="66" y="34" width="46" height="30" rx="4" fill="url(#windowGrad)" />
        <rect x="120" y="34" width="46" height="30" rx="4" fill="url(#windowGrad)" />
        <rect x="174" y="34" width="34" height="30" rx="4" fill="url(#windowGrad)" />
        {/* Front window */}
        <path d="M228 42 L 254 50 L 254 62 L 228 62 Z" fill="url(#windowGrad)" />
        {/* Little kids' silhouettes in windows */}
        <circle cx="35" cy="54" r="6" fill="#F5EDE3" opacity="0.75" />
        <circle cx="89" cy="52" r="6" fill="#F5EDE3" opacity="0.75" />
        <circle cx="143" cy="54" r="6" fill="#F5EDE3" opacity="0.75" />
        <circle cx="192" cy="52" r="6" fill="#F5EDE3" opacity="0.75" />
        {/* Door */}
        <rect x="200" y="60" width="18" height="40" rx="2" fill="#C25E3F" />
        <rect x="204" y="66" width="10" height="14" rx="2" fill="url(#windowGrad)" />
        {/* Headlight */}
        <circle cx="252" cy="76" r="4" fill="#FDF5C7" />
        {/* Stripe */}
        <rect x="0" y="76" width="220" height="6" fill="#C25E3F" />
        {/* Wheels */}
        <circle cx="46" cy="106" r="14" fill="#1A1A1A" />
        <circle cx="46" cy="106" r="6" fill="#3A3A3A" />
        <circle cx="220" cy="106" r="14" fill="#1A1A1A" />
        <circle cx="220" cy="106" r="6" fill="#3A3A3A" />
        {/* School sign */}
        <rect x="70" y="4" width="80" height="14" rx="3" fill="white" stroke="#C25E3F" strokeWidth="1.5" />
        <text x="110" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill="#C25E3F" fontFamily="system-ui">
          SCHOOL BUS
        </text>
      </g>

      {/* Small student figure waving */}
      <g transform="translate(315, 220)">
        <circle cx="0" cy="-30" r="8" fill="#FBBB99" />
        <rect x="-6" y="-22" width="12" height="24" rx="4" fill="#1F3A4D" />
        <rect x="-8" y="2" width="6" height="16" fill="#1F3A4D" />
        <rect x="2" y="2" width="6" height="16" fill="#1F3A4D" />
        <rect x="-14" y="-18" width="8" height="10" rx="2" fill="#8B4513" />
        {/* waving arm */}
        <line x1="6" y1="-16" x2="14" y2="-28" stroke="#FBBB99" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* Cloud */}
      <g fill="white" opacity="0.9">
        <circle cx="70" cy="50" r="14" />
        <circle cx="88" cy="50" r="18" />
        <circle cx="108" cy="50" r="14" />
        <rect x="70" y="50" width="38" height="14" />
      </g>
    </svg>
  );
}

function Stars() {
  return (
    <div className="flex -space-x-1">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="h-4 w-4 text-sunset-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.156c.969 0 1.371 1.24.588 1.81l-3.362 2.445a1 1 0 00-.363 1.118l1.286 3.955c.3.921-.755 1.688-1.539 1.118l-3.362-2.445a1 1 0 00-1.175 0l-3.362 2.445c-.784.57-1.838-.197-1.539-1.118l1.286-3.955a1 1 0 00-.363-1.118L2.98 9.382c-.784-.57-.38-1.81.588-1.81h4.156a1 1 0 00.95-.69l1.286-3.955z" />
        </svg>
      ))}
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

function TrustBar() {
  return (
    <section className="border-y border-charcoal-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
        <Stat value="180+" label="Onaylı Servisçi" />
        <Stat value="2.400+" label="Mutlu Veli" />
        <Stat value="25+" label="Anlaşmalı Okul" />
        <Stat value="4.8/5" label="Veli Memnuniyeti" />
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center md:text-left">
      <div className="text-3xl font-extrabold text-charcoal-900 md:text-4xl">
        {value}
      </div>
      <div className="mt-1 text-sm text-charcoal-500">{label}</div>
    </div>
  );
}

function Features() {
  const features = [
    {
      icon: <ShieldIcon />,
      title: 'Onaylı Servisçiler',
      desc: 'Her servisçi vergi levhası, ruhsat ve K belgesiyle doğrulanır. Sadece kurallara uyanlar sistemde kalır.',
    },
    {
      icon: <PriceIcon />,
      title: 'Şeffaf Fiyat',
      desc: 'Aylık ücret, araç bilgisi, güzergâh — hepsi başta gösterilir. Sürpriz ekleme yok.',
    },
    {
      icon: <LockIcon />,
      title: 'Kişisel Veri Güvenliği',
      desc: 'Telefon numaranız SMS onayıyla doğrulanır; servisçi ancak seçtiğinizde iletişim bilgilerinizi görür.',
    },
    {
      icon: <StarBadgeIcon />,
      title: 'Veli Puan Sistemi',
      desc: 'Gerçek velilerin puan ve yorumları. Servisçilere sadece hizmet aldığınız sonra puan verebilirsiniz.',
    },
  ];
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Neden Servis Platform
          </div>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-charcoal-900 md:text-5xl">
            Güvenli, şeffaf, hızlı.
          </h2>
          <p className="mt-4 text-lg text-charcoal-600">
            Sadece bir "teklif al" platformu değiliz — çocuğunuzun yolculuğuna
            odaklanan bir hizmet ağıyız.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card p-6 transition hover:shadow-card-hover">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sunset-100 to-sunset-200 text-sunset-700">
                {f.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold text-charcoal-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Talebinizi bırakın',
      desc: 'Telefonunuza gelen SMS ile doğrulayın, öğrenci ve okul bilgilerinizi girin. Sadece 2 dakika.',
      icon: <PhoneMessageIcon />,
      accent: 'from-sunset-100 to-sunset-200 text-sunset-700',
    },
    {
      n: '02',
      title: 'Teklifler size gelsin',
      desc: 'Bölgenizde okulunuza hizmet veren onaylı servisçiler size aylık ücret ve araç bilgisiyle teklif versin.',
      icon: <InboxIcon />,
      accent: 'from-deepsea-100 to-deepsea-200 text-deepsea-700',
    },
    {
      n: '03',
      title: 'Karşılaştırın, seçin',
      desc: 'Fiyat, araç modeli, puan ve yorumlara bakın. Uygun olanı tek tıkla seçin, servisçi size ulaşsın.',
      icon: <CompareIcon />,
      accent: 'from-sand-100 to-sand-200 text-charcoal-900',
    },
  ];
  return (
    <section id="nasil-calisir" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center rounded-full bg-sunset-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sunset-700">
            Nasıl Çalışır
          </div>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-charcoal-900 md:text-5xl">
            3 adımda okul servisi.
          </h2>
          <p className="mt-4 text-lg text-charcoal-600">
            Tek yerden onlarca servisçiye ulaşın, size uygun olanı seçin.
          </p>
        </div>

        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          <div className="pointer-events-none absolute left-1/6 right-1/6 top-16 hidden h-px bg-charcoal-100 md:block" />
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="card p-8 transition hover:shadow-card-hover">
                <div className="flex items-center justify-between">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${s.accent}`}>
                    {s.icon}
                  </div>
                  <span className="text-4xl font-black text-sand-200">{s.n}</span>
                </div>
                <h3 className="mt-6 text-xl font-bold text-charcoal-900">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-600">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote:
        'Bir hafta içinde 6 servisçiden teklif geldi. Fiyat ve araç yaşına göre karşılaştırıp aynı gün seçim yaptım. Süper pratik.',
      name: 'Zeynep A.',
      role: 'Veli · Altınordu',
      initials: 'ZA',
      bg: 'bg-sunset-500',
    },
    {
      quote:
        'Eskiden komşulardan servisçi tavsiye alıyordum. Şimdi tek yerden karşılaştırıyorum, puanları görüyorum. Güven veriyor.',
      name: 'Mehmet Y.',
      role: 'Veli · Ünye',
      initials: 'MY',
      bg: 'bg-deepsea-500',
    },
    {
      quote:
        'Servisçinin ruhsat, sigorta ve K belgesinin güncel olduğunu görmek çok rahatlatıyor. Çocuğumu güvenle emanet ediyorum.',
      name: 'Ayşe D.',
      role: 'Veli · Fatsa',
      initials: 'AD',
      bg: 'bg-charcoal-900',
    },
  ];
  return (
    <section className="bg-sand-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-charcoal-700 shadow-sm">
            Veli Yorumları
          </div>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-charcoal-900 md:text-5xl">
            Veliler ne diyor?
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((t) => (
            <div key={t.name} className="card p-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-1 text-sunset-500">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.156c.969 0 1.371 1.24.588 1.81l-3.362 2.445a1 1 0 00-.363 1.118l1.286 3.955c.3.921-.755 1.688-1.539 1.118l-3.362-2.445a1 1 0 00-1.175 0l-3.362 2.445c-.784.57-1.838-.197-1.539-1.118l1.286-3.955a1 1 0 00-.363-1.118L2.98 9.382c-.784-.57-.38-1.81.588-1.81h4.156a1 1 0 00.95-.69l1.286-3.955z" />
                    </svg>
                  ))}
                </div>
                <QuoteMarkIcon />
              </div>
              <p className="text-sm leading-relaxed text-charcoal-700">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white ${t.bg}`}>
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
      q: 'Servis Platform ücretli mi?',
      a: 'Veliler için tamamen ücretsizdir. Servisçiler aylık abonelikle sisteme dahil olur.',
    },
    {
      q: 'Servisçiler nasıl doğrulanıyor?',
      a: 'Her servisçi kayıt sırasında firma bilgileri, vergi numarası ve araç belgeleriyle admin onayından geçer.',
    },
    {
      q: 'Ödemeyi kime yapıyorum?',
      a: 'Seçtiğiniz servisçiye doğrudan ödeme yaparsınız. Dekontu sistemden yükleyerek takibini yapabilirsiniz.',
    },
    {
      q: 'Beğenmediğim servisçiyi değiştirebilir miyim?',
      a: 'Elbette. İstediğiniz zaman yeni bir talep açabilir, farklı servisçilerden teklif alabilirsiniz.',
    },
    {
      q: 'Verilerim güvende mi?',
      a: 'Telefon numaranız SMS ile doğrulanır. Servisçi ancak siz onu seçtikten sonra iletişim bilgilerinize erişebilir.',
    },
    {
      q: 'Puan verme nasıl çalışıyor?',
      a: 'Servisi bir süre kullandıktan sonra veli panelinizden servisçiyi puanlayıp yorum yazabilirsiniz.',
    },
  ];
  return (
    <section id="sss" className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-charcoal-700 shadow-sm">
            Sık Sorulan Sorular
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
              Hazır mısınız?
            </h3>
            <p className="mx-auto mt-4 max-w-xl text-lg text-charcoal-300">
              2 dakikanızı ayırın, bölgenizdeki servisçilerden teklifleri toplayalım.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/teklif-al" className="btn-primary text-base px-8 py-3.5">
                Ücretsiz Teklif Al
                <ArrowRight />
              </Link>
              <Link
                href="/veli/giris"
                className="btn text-base px-8 py-3.5 bg-white/10 text-white border border-white/20 hover:bg-white/20"
              >
                Veli Girişi
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ ICONS ============ */

function ShieldIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function StarBadgeIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="7" />
      <path d="M12 5l1.4 2.85 3.15.46-2.28 2.22.54 3.14L12 12.19l-2.81 1.48.54-3.14-2.28-2.22 3.15-.46L12 5z" fill="currentColor" strokeWidth="0" />
      <path d="M8.21 13.89L7 22l5-3 5 3-1.21-8.11" />
    </svg>
  );
}

function PhoneMessageIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="4" width="16" height="24" rx="3" />
      <line x1="14" y1="24" x2="18" y2="24" />
      <path d="M11 9h10v6H11z" fill="currentColor" opacity="0.15" strokeWidth="0" />
      <circle cx="14" cy="12" r="1" fill="currentColor" strokeWidth="0" />
      <circle cx="16" cy="12" r="1" fill="currentColor" strokeWidth="0" />
      <circle cx="18" cy="12" r="1" fill="currentColor" strokeWidth="0" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18V8a2 2 0 012-2h20a2 2 0 012 2v10" />
      <path d="M4 18l3-3h6l2 3h6l2-3h6l3 3" />
      <path d="M4 18v6a2 2 0 002 2h20a2 2 0 002-2v-6" />
      <circle cx="24" cy="8" r="4" fill="currentColor" strokeWidth="0" opacity="0.2" />
      <text x="24" y="10.5" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" strokeWidth="0">3</text>
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="10" height="20" rx="2" />
      <rect x="18" y="6" width="10" height="20" rx="2" />
      <line x1="7" y1="11" x2="11" y2="11" />
      <line x1="7" y1="15" x2="11" y2="15" />
      <line x1="7" y1="19" x2="11" y2="19" />
      <path d="M21 18l2 2 4-4" strokeWidth="2.5" />
    </svg>
  );
}

function QuoteMarkIcon() {
  return (
    <svg className="h-6 w-6 text-charcoal-200" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
    </svg>
  );
}
