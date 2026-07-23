import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { LegalHero } from '@/components/LegalHero';

export const metadata = { title: 'Kullanım Koşulları — Bindi' };

export default function KullanimKosullariPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <SiteHeader />
      <LegalHero
        badge="Kullanım Koşulları"
        title="Kullanım Koşulları"
        subtitle="Bindi'yi kullanırken uymanız gereken kurallar."
      />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-6 text-charcoal-700">
          <p className="text-xs text-charcoal-500">
            Son güncelleme: 21.07.2026
          </p>

          <Section title="1. Taraflar">
            Bu koşullar, Bindi platformunun sahibi ile platformu kullanan
            veliler ve servisçiler arasında geçerlidir. Platformu kullanarak bu
            koşulları kabul etmiş sayılırsınız.
          </Section>

          <Section title="2. Hizmetin Kapsamı">
            Bindi, veliler ile servisçiler arasında dijital bir buluşma
            ortamıdır. Servisçilerin sunduğu hizmetin kalitesi, güvenliği ve
            fiyatı ilgili servisçinin sorumluluğundadır. Bindi hizmet aracısı
            olarak taşımacılık hizmetinin bizzat sağlayıcısı değildir.
          </Section>

          <Section title="3. Veli Yükümlülükleri">
            <ul className="list-disc space-y-1 pl-6">
              <li>Doğru ve güncel bilgi vermek.</li>
              <li>
                Seçtiği servisçiye zamanında ödeme yapmak ve dekontu
                yüklemek.
              </li>
              <li>
                Servisçiye yönelik yorum ve puanlarında dürüst ve saygılı
                olmak.
              </li>
            </ul>
          </Section>

          <Section title="4. Servisçi Yükümlülükleri">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Vergi levhası, K yetki belgesi, ticaret sicil, sigortalar,
                ruhsat, muayene gibi tüm belgeleri güncel tutmak.
              </li>
              <li>
                Şoförleri için ehliyet, SRC belgesi, sağlık raporu, adli sicil
                gibi belgeleri sisteme yüklemek.
              </li>
              <li>
                Yaptığı teklifi eksiksiz uygulamak, güzergâh ve fiyat
                değişikliklerinde veliyi bilgilendirmek.
              </li>
              <li>
                Öğrenci güvenliği için trafik kurallarına ve mesleki etiğe
                uymak.
              </li>
            </ul>
          </Section>

          <Section title="5. Ücretler">
            Veliler için Bindi kullanımı ücretsizdir. Servisçiler için aylık
            sabit paket abonelikleri geçerlidir. Alınan işten komisyon
            uygulanmaz.
          </Section>

          <Section title="6. Yasaklanan Davranışlar">
            <ul className="list-disc space-y-1 pl-6">
              <li>Sahte belge, kimlik veya bilgi yükleme</li>
              <li>Platform dışına yönlendirici teklif veya kampanya</li>
              <li>Başka kullanıcıları taciz eden içerik</li>
              <li>Otomatik yollarla veri toplama, scraping</li>
            </ul>
          </Section>

          <Section title="7. Hesap İptali ve Askıya Alma">
            Bindi, bu koşulları veya yasaları ihlal eden hesapları uyarısız
            askıya alma veya sonlandırma hakkına sahiptir.
          </Section>

          <Section title="8. Sorumluluk Sınırı">
            Bindi, servisçi–veli arasındaki hizmetin kalitesi, gecikmesi, kaza
            veya kayıplarından doğrudan sorumlu değildir. Aracı kurum
            olarak yalnızca platform hizmetinin sunumundan sorumludur.
          </Section>

          <Section title="9. Uygulanacak Hukuk">
            Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda
            İstanbul Merkez mahkemeleri ve icra daireleri yetkilidir.
          </Section>

          <Section title="10. Değişiklikler">
            Bu koşullar zaman zaman güncellenebilir. Güncel sürüm platformda
            yayınlandığı an itibarıyla geçerlidir.
          </Section>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-charcoal-900">{title}</h2>
      <div className="text-sm leading-relaxed text-charcoal-700">{children}</div>
    </div>
  );
}
