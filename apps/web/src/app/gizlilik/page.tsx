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
            Son güncelleme: 16.08.2026
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
                <b>Konum verisi (mobil uygulama):</b> yalnızca aktif servis
                sırasında sürücünün cihazından toplanan hassas ve arka plan
                konum bilgisi. Detay için 2. bölüme bakın.
              </li>
              <li>
                Otomatik: IP, tarayıcı, ziyaret zamanı, oturum çerezleri.
              </li>
            </ul>
          </Section>

          <Section title="2. Konum Verisi (Mobil Uygulama)">
            <p className="mb-3">
              Bindi mobil uygulaması, <b>Canlı Servis Takibi</b> özelliği için
              konum verisi kullanır. Bu bölüm Google Play konum politikası
              gereği ayrıntılı olarak açıklanmıştır.
            </p>
            <p className="mt-3 mb-1"><b>Ne toplanır?</b></p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <b>Sürücü tarafında:</b> aktif servis sırasında hassas konum
                (<code>ACCESS_FINE_LOCATION</code>) ve arka plan konumu
                (<code>ACCESS_BACKGROUND_LOCATION</code>) yaklaşık her 10
                saniyede bir sunucumuza iletilir.
              </li>
              <li>
                <b>Veli tarafında:</b> konum verisi toplanmaz. Veli yalnızca
                sürücünün paylaştığı konumu haritada görüntüler.
              </li>
            </ul>
            <p className="mt-3 mb-1"><b>Ne zaman toplanır?</b></p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Sürücü uygulamada &ldquo;Servisi Başlat&rdquo; butonuna açıkça
                bastığında başlar. Foreground bildirim gösterilir.
              </li>
              <li>
                Sürücü &ldquo;Servisi Bitir&rdquo; tıkladığında arka plan takibi
                dahil <b>tamamen</b> durur.
              </li>
              <li>
                Servis dışında (uygulama açık olsa bile) konum takibi yapılmaz.
              </li>
            </ul>
            <p className="mt-3 mb-1"><b>Neden toplanır?</b></p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Velinin, çocuğunun servisinin nerede olduğunu ve okula/eve ne
                zaman ulaşacağını gerçek zamanlı görebilmesi için.
              </li>
              <li>
                Servisçinin rota kayıtlarını tutabilmesi ve gerektiğinde geriye
                dönük kontrol edebilmesi için.
              </li>
            </ul>
            <p className="mt-3 mb-1"><b>Kim erişebilir?</b></p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Yalnızca ilgili servisin velisi ve konumu paylaşan servisçinin
                kendisi.
              </li>
              <li>
                Bindi sistem yöneticileri (güvenlik / destek amaçlı, denetim
                kayıtları üzerinden).
              </li>
              <li>
                Üçüncü taraflara <b>satılmaz</b>, reklam amaçlı{' '}
                <b>kullanılmaz</b>, üçüncü taraf analiz servislerine{' '}
                <b>gönderilmez</b>.
              </li>
            </ul>
            <p className="mt-3 mb-1"><b>Ne kadar saklanır?</b></p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Servis bitiminden <b>24 saat sonra</b> sürücü konum kayıtları
                kalıcı olarak silinir.
              </li>
              <li>
                Yalnızca &ldquo;servis başladı/bitti&rdquo; olay kaydı denetim
                için 1 yıl tutulur ve <b>konum içermez</b>.
              </li>
            </ul>
            <p className="mt-3 mb-1"><b>Kontrolünüz</b></p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Sürücü her zaman &ldquo;Servisi Bitir&rdquo; ile konum
                paylaşımını durdurabilir.
              </li>
              <li>
                iOS Ayarlar &rarr; Bindi &rarr; Konum veya Android Ayarlar
                &rarr; Uygulamalar &rarr; Bindi &rarr; İzinler menüsünden konum
                iznini istediğiniz zaman geri çekebilirsiniz. Bu durumda canlı
                takip özelliği çalışmaz ancak diğer özellikler etkilenmez.
              </li>
            </ul>
          </Section>

          <Section title="3. Verilerin Kullanım Amaçları">
            <ul className="list-disc space-y-1 pl-6">
              <li>Hizmetin sunulması ve iyileştirilmesi</li>
              <li>Servisçi–veli eşleştirmesi</li>
              <li>Belge geçerliliği takibi ve hatırlatmalar</li>
              <li>Sözleşme ve yasal yükümlülüklerin yerine getirilmesi</li>
              <li>Kullanıcı destek ve iletişim</li>
              <li>Güvenlik, dolandırıcılık önleme ve platform bütünlüğü</li>
            </ul>
          </Section>

          <Section title="4. Verilerin Paylaşımı">
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

          <Section title="5. Saklama Süresi">
            Veriler, hizmetin sunulması için gerekli süre ve yasal saklama
            yükümlülüğü çerçevesinde muhafaza edilir. Kullanıcı hesabı
            silindiğinde ilgili veriler kısa süre içinde anonimleştirilir veya
            imha edilir.
          </Section>

          <Section title="6. Haklarınız (KVKK md. 11)">
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

          <Section title="7. Çerezler">
            Platformumuzda oturum yönetimi ve tercihlerin hatırlanması için
            zorunlu çerezler kullanılır. İsteğe bağlı analitik/pazarlama çerezi
            kullanılmamaktadır.
          </Section>

          <Section title="8. Değişiklikler">
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
