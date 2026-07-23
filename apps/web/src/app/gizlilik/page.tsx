import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { LegalHero } from '@/components/LegalHero';

export const metadata = { title: 'Gizlilik Politikası — Bindi' };

export default function GizlilikPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <SiteHeader />
      <LegalHero
        badge="Gizlilik"
        title="Gizlilik Politikası"
        subtitle="Kişisel verileriniz Bindi tarafından nasıl işlenir?"
      />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-6 text-charcoal-700">
          <p className="text-xs text-charcoal-500">
            Son güncelleme: 21.07.2026
          </p>

          <Section title="1. Toplanan Bilgiler">
            Bindi platformu üzerinden hizmet alırken bize aşağıdaki verileri
            iletebilirsiniz:
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <b>Veli:</b> ad, soyad, telefon, e-posta, adres, öğrenci
                bilgileri, okul, güzergâh notları.
              </li>
              <li>
                <b>Servisçi:</b> firma ünvanı, vergi numarası, yetkili adı,
                iletişim, hizmet bölgesi, araç bilgileri, şoför bilgileri,
                belgeler (ruhsat, sigorta, K belgesi, ehliyet, SRC, adli sicil,
                sağlık raporu vb.).
              </li>
              <li>
                Otomatik: IP, tarayıcı, ziyaret zamanı, oturum çerezleri.
              </li>
            </ul>
          </Section>

          <Section title="2. Verilerin Kullanım Amaçları">
            <ul className="list-disc space-y-1 pl-6">
              <li>Hizmetin sunulması ve iyileştirilmesi</li>
              <li>Servisçi–veli eşleştirmesi</li>
              <li>Belge geçerliliği takibi ve hatırlatmalar</li>
              <li>Sözleşme ve yasal yükümlülüklerin yerine getirilmesi</li>
              <li>Kullanıcı destek ve iletişim</li>
              <li>Güvenlik, dolandırıcılık önleme ve platform bütünlüğü</li>
            </ul>
          </Section>

          <Section title="3. Verilerin Paylaşımı">
            Kişisel verileriniz üçüncü kişilerle satılmaz. Yalnızca aşağıdaki
            durumlarda paylaşılır:
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                Veli ile seçilen servisçi arasında (teklif kabulünden sonra
                iletişim bilgileri açılır).
              </li>
              <li>
                Yasal zorunluluk halinde yetkili kamu makamlarına.
              </li>
              <li>
                Hizmet sağlayıcılarımızla (SMS, e-posta, dosya depolama)
                yalnızca hizmetin gerektirdiği ölçüde.
              </li>
            </ul>
          </Section>

          <Section title="4. Saklama Süresi">
            Veriler, hizmetin sunulması için gerekli süre ve yasal saklama
            yükümlülüğü çerçevesinde muhafaza edilir. Kullanıcı hesabı
            silindiğinde ilgili veriler kısa süre içinde anonimleştirilir veya
            imha edilir.
          </Section>

          <Section title="5. Haklarınız (KVKK md. 11)">
            Kişisel verilerinize ilişkin bilgi almak, düzeltmek, silmek veya
            işlemeye itiraz etmek için{' '}
            <a
              href="mailto:destek@bindi.com.tr"
              className="text-sunset-600 hover:text-sunset-700"
            >
              destek@bindi.com.tr
            </a>{' '}
            adresine yazabilirsiniz. Detaylı bilgi için{' '}
            <a href="/kvkk" className="text-sunset-600 hover:text-sunset-700">
              KVKK Aydınlatma Metni
            </a>
            'ni okuyun.
          </Section>

          <Section title="6. Çerezler">
            Platformumuzda oturum yönetimi ve tercihlerin hatırlanması için
            zorunlu çerezler kullanılır. İsteğe bağlı analitik/pazarlama çerezi
            kullanılmamaktadır.
          </Section>

          <Section title="7. Değişiklikler">
            Bu politika zaman zaman güncellenebilir. Değişiklikler yayınlandığı
            an itibarıyla geçerlidir.
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
      <div className="text-sm leading-relaxed text-charcoal-700">
        {children}
      </div>
    </div>
  );
}
