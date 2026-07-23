import Link from 'next/link';
import { Logo } from './Logo';

export function AuthLayout({
  title,
  subtitle,
  children,
  side,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  side: 'admin' | 'provider' | 'parent';
}) {
  const sideContent = {
    admin: {
      quote:
        '"Sistemi 2 saatte kurduk. Servisçi başvurularını tek bir yerden yönetebiliyoruz."',
      author: 'Platform Admin',
      badge: 'ADMIN',
    },
    provider: {
      quote:
        '"Bölgemdeki tüm veli taleplerini panelden görüyorum. Ay içinde 12 yeni müşteri kazandım."',
      author: 'Barış Servis · Ordu',
      badge: 'SERVİSÇİ',
    },
    parent: {
      quote:
        '"Bir haftada 8 servisçiden teklif geldi. Fiyat ve araç yaşına göre karşılaştırıp seçtim."',
      author: 'Zeynep A. · Veli',
      badge: 'VELİ',
    },
  }[side];

  return (
    <div className="min-h-screen bg-sand-50 lg:grid lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden overflow-hidden bg-charcoal-900 lg:flex lg:flex-col">
        <div className="absolute -right-20 top-20 h-96 w-96 rounded-full bg-sunset-500/20 blur-3xl" />
        <div className="absolute -left-20 bottom-20 h-72 w-72 rounded-full bg-deepsea-500/30 blur-3xl" />

        <div className="relative flex flex-1 flex-col p-12 text-white">
          <div>
            <Logo variant="dark" />
          </div>

          <div className="mt-auto">
            <div className="mb-4 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-sunset-300 ring-1 ring-white/10">
              {sideContent.badge} Girişi
            </div>
            <div className="text-3xl font-extrabold leading-snug tracking-tight md:text-4xl">
              {title === 'Servisçi Girişi' || title === 'Servisçi Kayıt'
                ? 'Bölgenizdeki velileri bulun.'
                : title === 'Admin Girişi'
                  ? 'Platformu yönet.'
                  : 'Doğru servisçiyi seçin.'}
            </div>
            <blockquote className="mt-8 border-l-2 border-sunset-500 pl-4 text-sm italic text-charcoal-200">
              {sideContent.quote}
            </blockquote>
            <div className="mt-3 text-xs font-medium text-charcoal-400">
              — {sideContent.author}
            </div>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-col">
        <header className="flex items-center justify-between p-6 lg:hidden">
          <Logo />
        </header>
        <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-charcoal-900">
                {title}
              </h1>
              <p className="mt-2 text-sm text-charcoal-600">{subtitle}</p>
            </div>
            {children}
            <div className="mt-8 text-center text-xs text-charcoal-500">
              <Link href="/" className="hover:text-charcoal-900">
                ← Anasayfaya dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
