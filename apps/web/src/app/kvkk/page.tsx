import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { LegalHero } from '@/components/LegalHero';

export const metadata = { title: 'KVKK Aydınlatma Metni — Bindi' };

export default function KvkkPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <SiteHeader />
      <LegalHero
        badge="KVKK"
        title="Kişisel Verilerin Korunması Aydınlatma Metni"
        subtitle="6698 sayılı KVKK kapsamında kişisel verilerinizin nasıl işlendiği."
      />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-6 text-charcoal-700">
          <p className="text-xs text-charcoal-500">
            Son güncelleme: 21.07.2026
          </p>

          <Section title="Veri Sorumlusu">
            Bindi platformu (bindi.com.tr) sizden aldığı kişisel verilerin veri
            sorumlusudur. İletişim:{' '}
            <a
              href="mailto:destek@bindi.com.tr"
              className="text-sunset-600 hover:text-sunset-700"
            >
              destek@bindi.com.tr
            </a>
          </Section>

          <Section title="İşlenen Kişisel Veri Kategorileri">
            <ul className="list-disc space-y-1 pl-6">
              <li>Kimlik: ad, soyad, TC kimlik no (şoför belgesi için)</li>
              <li>İletişim: telefon, e-posta, adres</li>
              <li>Aile: öğrenci bilgileri (ad, sınıf, okul)</li>
              <li>Finansal: banka dekontu (ödeme takibi için)</li>
              <li>
                Mesleki: firma ünvanı, vergi no, K belgesi, sigorta bilgileri
                (servisçi için)
              </li>
              <li>Belgeler: yüklediğiniz her türlü resmi belge</li>
              <li>İşlem: platform kullanım kayıtları, teklif ve talep geçmişi</li>
              <li>Teknik: IP, tarayıcı bilgisi, oturum çerezleri</li>
            </ul>
          </Section>

          <Section title="İşleme Amacı ve Hukuki Sebep">
            Kişisel verileriniz, aşağıdaki amaçlarla ve KVKK md. 5–6 uyarınca
            işlenir:
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Sözleşmenin kurulması ve ifası (md. 5/2-c)</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi (md. 5/2-a)</li>
              <li>Meşru menfaat: platform güvenliği (md. 5/2-f)</li>
              <li>Açık rızanız halinde: pazarlama iletişimi (md. 5/1)</li>
            </ul>
          </Section>

          <Section title="Aktarım">
            Kişisel verileriniz;
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Seçtiğiniz servisçi ile (veli için) veya seçen veli ile (servisçi için)</li>
              <li>SMS sağlayıcımız Netgsm A.Ş. ile</li>
              <li>E-posta ve dosya depolama hizmet sağlayıcılarımız ile</li>
              <li>Yasal talep halinde yetkili kamu makamlarıyla</li>
            </ul>
            paylaşılabilir. Yurt dışına veri aktarımı yapılmamaktadır.
          </Section>

          <Section title="Toplama Yöntemi">
            Verileriniz doğrudan sizden dijital form, dosya yükleme ve iletişim
            araçları ile alınır.
          </Section>

          <Section title="Haklarınız (KVKK md. 11)">
            KVKK'nın 11. maddesine göre:
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>Nerede, nasıl, ne için işlendiğini öğrenme</li>
              <li>Aktarıldığı üçüncü kişileri öğrenme</li>
              <li>Eksik/yanlış işlenmişse düzeltilmesini isteme</li>
              <li>Silinmesini veya yok edilmesini isteme</li>
              <li>Otomatik sistemlerle analiz sonucu itiraz etme</li>
              <li>Kanuna aykırı işleme nedeniyle zararınızı tazmin etme</li>
            </ul>
            haklarına sahipsiniz. Bu hakları kullanmak için{' '}
            <a
              href="mailto:destek@bindi.com.tr"
              className="text-sunset-600 hover:text-sunset-700"
            >
              destek@bindi.com.tr
            </a>{' '}
            adresine yazılı başvuru yapabilirsiniz. Başvurunuz KVKK md. 13
            uyarınca en geç 30 gün içinde sonuçlandırılır.
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
