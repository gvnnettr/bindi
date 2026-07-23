import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { LegalHero } from '@/components/LegalHero';

export const metadata = {
  title: 'Hakkımızda — Bindi',
};

export default function HakkimizdaPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <SiteHeader />
      <LegalHero
        badge="Hakkımızda"
        title="Türkiye'nin en pratik okul servisi platformu."
        subtitle="Velilerin güvenli, servisçilerin adil bir pazarda buluştuğu ortak alan."
      />

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="prose prose-charcoal max-w-none space-y-6 text-charcoal-700">
          <h2 className="text-2xl font-black text-charcoal-900">Vizyonumuz</h2>
          <p>
            Bindi, okul servisi arayan velileri onaylı, belgeleri güncel ve
            güvenilir servisçilerle buluşturan bağımsız bir dijital pazardır.
            Amacımız, veli için karşılaştırmayı ve seçmeyi kolaylaştırırken
            servisçilerin de operasyonel yükünü hafifletmektir.
          </p>

          <h2 className="mt-8 text-2xl font-black text-charcoal-900">Ne yapıyoruz?</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Velilerden gelen okul servisi taleplerini yakınındaki onaylı
              servisçilere iletiyoruz.
            </li>
            <li>
              Servisçilerin ehliyet, sigorta, K belgesi gibi belgelerini takip
              ediyor, süresi dolanları önceden uyarıyoruz.
            </li>
            <li>
              Veli–servisçi arasındaki aylık ödeme süreçlerini şeffaflaştırıyor,
              dekont onay akışını dijitalleştiriyoruz.
            </li>
            <li>
              Bağımsız veli puanları ile şeffaf bir tavsiye sistemi
              işletiyoruz.
            </li>
          </ul>

          <h2 className="mt-8 text-2xl font-black text-charcoal-900">
            Neden Bindi?
          </h2>
          <p>
            Rakip platformlar tek taraflı çalışırken biz iki tarafa da eşit
            değer vermeyi hedefliyoruz: veliye seçim özgürlüğü, servisçiye adil
            bir pazar erişimi. Servisçilerden aldığımız aylık sabit abonelik
            dışında satılan iş başına komisyon almayız.
          </p>

          <div className="mt-10 rounded-2xl bg-charcoal-900 p-8 text-white">
            <h3 className="text-lg font-bold">Bize ulaşın</h3>
            <p className="mt-2 text-charcoal-300">
              Öneri, iş birliği veya destek talepleriniz için{' '}
              <Link href="/iletisim" className="underline">
                iletişim sayfamız
              </Link>
              'dan yazabilirsiniz.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
