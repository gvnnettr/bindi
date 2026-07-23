// Türkiye il ve ilçe verisi.
// İl listesi eksiksizdir (81 il). İlçe listesi öncelikle merkezi ve büyük
// iller için tamamlanmıştır; kalan iller için genişletilecek.

export const TURKEY_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya',
  'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir',
  'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu',
  'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli',
  'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum',
  'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay',
  'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük',
  'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis', 'Kırıkkale',
  'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya',
  'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde',
  'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt',
  'Sinop', 'Sivas', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli',
  'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
] as const;

export type TurkeyCity = (typeof TURKEY_CITIES)[number];

// Öncelikli iller için tam ilçe listesi. Diğer iller için array boş
// bırakılırsa UI ilçe girişini serbest metne düşürür.
export const TURKEY_DISTRICTS: Record<string, readonly string[]> = {
  İstanbul: [
    'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar',
    'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş',
    'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca',
    'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih',
    'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal',
    'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
    'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
    'Ümraniye', 'Üsküdar', 'Zeytinburnu',
  ],
  Ankara: [
    'Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere',
    'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı',
    'Güdül', 'Haymana', 'Kahramankazan', 'Kalecik', 'Keçiören',
    'Kızılcahamam', 'Mamak', 'Nallıhan', 'Polatlı', 'Pursaklar',
    'Sincan', 'Şereflikoçhisar', 'Yenimahalle',
  ],
  İzmir: [
    'Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ',
    'Bornova', 'Buca', 'Çeşme', 'Çiğli', 'Dikili', 'Foça', 'Gaziemir',
    'Güzelbahçe', 'Karabağlar', 'Karaburun', 'Karşıyaka', 'Kemalpaşa',
    'Kınık', 'Kiraz', 'Konak', 'Menderes', 'Menemen', 'Narlıdere',
    'Ödemiş', 'Seferihisar', 'Selçuk', 'Tire', 'Torbalı', 'Urla',
  ],
  Ordu: [
    'Akkuş', 'Altınordu', 'Aybastı', 'Çamaş', 'Çatalpınar', 'Çaybaşı',
    'Fatsa', 'Gölköy', 'Gülyalı', 'Gürgentepe', 'İkizce', 'Kabadüz',
    'Kabataş', 'Korgan', 'Kumru', 'Mesudiye', 'Perşembe', 'Ulubey',
    'Ünye',
  ],
  Bursa: [
    'Büyükorhan', 'Gemlik', 'Gürsu', 'Harmancık', 'İnegöl', 'İznik',
    'Karacabey', 'Keles', 'Kestel', 'Mudanya', 'Mustafakemalpaşa',
    'Nilüfer', 'Orhaneli', 'Orhangazi', 'Osmangazi', 'Yenişehir',
    'Yıldırım',
  ],
  Antalya: [
    'Akseki', 'Aksu', 'Alanya', 'Demre', 'Döşemealtı', 'Elmalı',
    'Finike', 'Gazipaşa', 'Gündoğmuş', 'İbradı', 'Kaş', 'Kemer',
    'Kepez', 'Konyaaltı', 'Korkuteli', 'Kumluca', 'Manavgat',
    'Muratpaşa', 'Serik',
  ],
  Adana: [
    'Aladağ', 'Ceyhan', 'Çukurova', 'Feke', 'İmamoğlu', 'Karaisalı',
    'Karataş', 'Kozan', 'Pozantı', 'Saimbeyli', 'Sarıçam', 'Seyhan',
    'Tufanbeyli', 'Yumurtalık', 'Yüreğir',
  ],
  Gaziantep: [
    'Araban', 'İslahiye', 'Karkamış', 'Nizip', 'Nurdağı', 'Oğuzeli',
    'Şahinbey', 'Şehitkamil', 'Yavuzeli',
  ],
  Konya: [
    'Ahırlı', 'Akören', 'Akşehir', 'Altınekin', 'Beyşehir', 'Bozkır',
    'Cihanbeyli', 'Çeltik', 'Çumra', 'Derbent', 'Derebucak', 'Doğanhisar',
    'Emirgazi', 'Ereğli', 'Güneysınır', 'Hadim', 'Halkapınar',
    'Hüyük', 'Ilgın', 'Kadınhanı', 'Karapınar', 'Karatay', 'Kulu',
    'Meram', 'Sarayönü', 'Selçuklu', 'Seydişehir', 'Taşkent', 'Tuzlukçu',
    'Yalıhüyük', 'Yunak',
  ],
  Kayseri: [
    'Akkışla', 'Bünyan', 'Develi', 'Felahiye', 'Hacılar', 'İncesu',
    'Kocasinan', 'Melikgazi', 'Özvatan', 'Pınarbaşı', 'Sarıoğlan',
    'Sarız', 'Talas', 'Tomarza', 'Yahyalı', 'Yeşilhisar',
  ],
  Trabzon: [
    'Akçaabat', 'Araklı', 'Arsin', 'Beşikdüzü', 'Çarşıbaşı', 'Çaykara',
    'Dernekpazarı', 'Düzköy', 'Hayrat', 'Köprübaşı', 'Maçka', 'Of',
    'Ortahisar', 'Şalpazarı', 'Sürmene', 'Tonya', 'Vakfıkebir',
    'Yomra',
  ],
  Samsun: [
    'Alaçam', 'Asarcık', 'Atakum', 'Ayvacık', 'Bafra', 'Canik',
    'Çarşamba', 'Havza', 'İlkadım', 'Kavak', 'Ladik', 'Ondokuzmayıs',
    'Salıpazarı', 'Tekkeköy', 'Terme', 'Vezirköprü', 'Yakakent',
  ],
  Giresun: [
    'Alucra', 'Bulancak', 'Çamoluk', 'Çanakçı', 'Dereli', 'Doğankent',
    'Espiye', 'Eynesil', 'Görele', 'Güce', 'Keşap', 'Merkez', 'Piraziz',
    'Şebinkarahisar', 'Tirebolu', 'Yağlıdere',
  ],
  Rize: [
    'Ardeşen', 'Çamlıhemşin', 'Çayeli', 'Derepazarı', 'Fındıklı',
    'Güneysu', 'Hemşin', 'İkizdere', 'İyidere', 'Kalkandere', 'Merkez',
    'Pazar',
  ],
  Sinop: [
    'Ayancık', 'Boyabat', 'Dikmen', 'Durağan', 'Erfelek', 'Gerze',
    'Merkez', 'Saraydüzü', 'Türkeli',
  ],
  Kastamonu: [
    'Abana', 'Ağlı', 'Araç', 'Azdavay', 'Bozkurt', 'Cide', 'Çatalzeytin',
    'Daday', 'Devrekani', 'Doğanyurt', 'Hanönü', 'İhsangazi', 'İnebolu',
    'Küre', 'Merkez', 'Pınarbaşı', 'Seydiler', 'Şenpazar', 'Taşköprü',
    'Tosya',
  ],
  Amasya: [
    'Göynücek', 'Gümüşhacıköy', 'Hamamözü', 'Merkez', 'Merzifon',
    'Suluova', 'Taşova',
  ],
  Tokat: [
    'Almus', 'Artova', 'Başçiftlik', 'Erbaa', 'Merkez', 'Niksar',
    'Pazar', 'Reşadiye', 'Sulusaray', 'Turhal', 'Yeşilyurt', 'Zile',
  ],
  Zonguldak: [
    'Alaplı', 'Çaycuma', 'Devrek', 'Ereğli', 'Gökçebey', 'Kilimli',
    'Kozlu', 'Merkez',
  ],
  Muğla: [
    'Bodrum', 'Dalaman', 'Datça', 'Fethiye', 'Kavaklıdere', 'Köyceğiz',
    'Marmaris', 'Menteşe', 'Milas', 'Ortaca', 'Seydikemer', 'Ula',
    'Yatağan',
  ],
  Denizli: [
    'Acıpayam', 'Babadağ', 'Baklan', 'Bekilli', 'Beyağaç', 'Bozkurt',
    'Buldan', 'Çal', 'Çameli', 'Çardak', 'Çivril', 'Güney', 'Honaz',
    'Kale', 'Merkezefendi', 'Pamukkale', 'Sarayköy', 'Serinhisar',
    'Tavas',
  ],
  Manisa: [
    'Ahmetli', 'Akhisar', 'Alaşehir', 'Demirci', 'Gölmarmara',
    'Gördes', 'Kırkağaç', 'Köprübaşı', 'Kula', 'Salihli', 'Sarıgöl',
    'Saruhanlı', 'Selendi', 'Soma', 'Şehzadeler', 'Turgutlu', 'Yunusemre',
  ],
  Sakarya: [
    'Adapazarı', 'Akyazı', 'Arifiye', 'Erenler', 'Ferizli', 'Geyve',
    'Hendek', 'Karapürçek', 'Karasu', 'Kaynarca', 'Kocaali', 'Pamukova',
    'Sapanca', 'Serdivan', 'Söğütlü', 'Taraklı',
  ],
  Kocaeli: [
    'Başiskele', 'Çayırova', 'Darıca', 'Derince', 'Dilovası', 'Gebze',
    'Gölcük', 'İzmit', 'Kandıra', 'Karamürsel', 'Kartepe', 'Körfez',
  ],
  Eskişehir: [
    'Alpu', 'Beylikova', 'Çifteler', 'Günyüzü', 'Han', 'İnönü',
    'Mahmudiye', 'Mihalgazi', 'Mihalıççık', 'Odunpazarı', 'Sarıcakaya',
    'Seyitgazi', 'Sivrihisar', 'Tepebaşı',
  ],
  Malatya: [
    'Akçadağ', 'Arapgir', 'Arguvan', 'Battalgazi', 'Darende', 'Doğanşehir',
    'Doğanyol', 'Hekimhan', 'Kale', 'Kuluncak', 'Pütürge', 'Yazıhan',
    'Yeşilyurt',
  ],
  Balıkesir: [
    'Altıeylül', 'Ayvalık', 'Balya', 'Bandırma', 'Bigadiç', 'Burhaniye',
    'Dursunbey', 'Edremit', 'Erdek', 'Gömeç', 'Gönen', 'Havran',
    'İvrindi', 'Karesi', 'Kepsut', 'Manyas', 'Marmara', 'Savaştepe',
    'Sındırgı', 'Susurluk',
  ],
  Mersin: [
    'Akdeniz', 'Anamur', 'Aydıncık', 'Bozyazı', 'Çamlıyayla', 'Erdemli',
    'Gülnar', 'Mezitli', 'Mut', 'Silifke', 'Tarsus', 'Toroslar', 'Yenişehir',
  ],
};

/** Bir il için ilçe listesi. Bilinmiyorsa boş dizi. */
export function getDistricts(city: string): readonly string[] {
  return TURKEY_DISTRICTS[city] ?? [];
}

// Öncelikli ilçeler için mahalle listeleri. Anahtar "İl|İlçe" formatında.
// Bilinmeyen ilçeler için UI serbest metin girişine düşer.
export const TURKEY_NEIGHBORHOODS: Record<string, readonly string[]> = {
  'Ordu|Altınordu': [
    'Akyazı', 'Aliye', 'Aziziye', 'Bahçelievler', 'Bahçekent',
    'Boztepe', 'Bucak', 'Cumhuriyet', 'Çınarlar', 'Dede', 'Düz',
    'Efirli', 'Eskipazar', 'Fatih', 'Gazi', 'Güzelyalı', 'Ilıca',
    'Kaledere', 'Karşıyaka', 'Kirazlımescit', 'Kirişhane', 'Kumbaşı',
    'Manastır', 'Meşale', 'Muhtaroğlu', 'Nemrut', 'Nuriye',
    'Osmaniye', 'Sabuncu', 'Selimiye', 'Şahincili',
    'Şehit Cengiz Karaca', 'Şirinevler', 'Taşocak', 'Toygar',
    'Turnasuyu', 'Uzunmusa', 'Yaykın', 'Yeni', 'Yeşilyurt',
    'Zaferimilli',
  ],
  'İstanbul|Kadıköy': [
    'Acıbadem', 'Bostancı', 'Caddebostan', 'Caferağa', 'Dumlupınar',
    'Eğitim', 'Erenköy', 'Fenerbahçe', 'Feneryolu', 'Fikirtepe',
    'Göztepe', 'Hasanpaşa', 'Koşuyolu', 'Kozyatağı', 'Merdivenköy',
    'Osmanağa', 'Rasimpaşa', 'Sahrayıcedit', 'Suadiye', '19 Mayıs',
    'Zühtüpaşa',
  ],
  'İstanbul|Beşiktaş': [
    'Abbasağa', 'Akatlar', 'Arnavutköy', 'Balmumcu', 'Bebek',
    'Cihannüma', 'Dikilitaş', 'Etiler', 'Gayrettepe', 'Konaklar',
    'Kuruçeşme', 'Levazım', 'Levent', 'Kültür', 'Mecidiye',
    'Muradiye', 'Nispetiye', 'Ortaköy', 'Sinanpaşa', 'Türkali',
    'Ulus', 'Vişnezade', 'Yıldız',
  ],
  'İstanbul|Üsküdar': [
    'Acıbadem', 'Ahmediye', 'Altunizade', 'Aziz Mahmut Hüdayi',
    'Bahçelievler', 'Barbaros', 'Beylerbeyi', 'Bulgurlu', 'Burhaniye',
    'Cumhuriyet', 'Çengelköy', 'Ferah', 'Güzeltepe', 'İcadiye',
    'Kandilli', 'Kirazlıtepe', 'Kısıklı', 'Kuleli', 'Kuzguncuk',
    'Küçüksu', 'Küplüce', 'Mimar Sinan', 'Murat Reis', 'Salacak',
    'Selami Ali', 'Selimiye', 'Sultantepe', 'Ünalan', 'Valide-i Atik',
    'Yavuztürk',
  ],
};

export function getNeighborhoods(city: string, district: string): readonly string[] {
  return TURKEY_NEIGHBORHOODS[`${city}|${district}`] ?? [];
}
