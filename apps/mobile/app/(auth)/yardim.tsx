import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  {
    q: 'Bindi nedir?',
    a: 'Bindi, okul servisçileri ile veliler arasında güvenli teklif alışverişi yapılan bir platformdur. Veliler tek talepte birden fazla servisçiden fiyat teklifi alır, seçimi kendileri yapar.',
  },
  {
    q: 'Servisçi olarak nasıl kayıt olurum?',
    a: 'Bindi.com.tr üzerinden ya da bu uygulamadan "Servisçiyim" seçip firma bilgilerini gir. Zorunlu belgelerini yükle. Admin ekibimiz belgeleri inceleyip onaylar (~1 iş günü), SMS ile giriş bilgin ulaşır.',
  },
  {
    q: 'Veli olarak nasıl teklif alırım?',
    a: 'Ana ekranda "Veliyim" seçip telefonunla giriş yap. "Yeni Talep" ile çocuğunun bilgilerini, okul ve adres bilgilerini gir. Bölgende çalışan tüm servisçilere anında iletilir, teklifleri panelde gelir.',
  },
  {
    q: 'Ödemeleri Bindi mi alıyor?',
    a: 'Hayır. Ödeme veliden servisçiye direkt yapılır (havale, EFT veya elden). Bindi ortada tutmaz. Veli dekontu yükler, servisçi görür ve onaylar.',
  },
  {
    q: 'Servisçiyi nasıl seçerim?',
    a: 'Puan, verilen ücret, aracın yılı, koltuk kapasitesi ve verdiği notlara bakarak sana en uygun olanı seç. Seçim yapıldığında iletişim bilgileri sana açılır.',
  },
  {
    q: 'Servisçinin belgeleri güvende mi?',
    a: 'Evet. Vergi levhası, K yetki belgesi, ruhsat, muayene, sigorta gibi tüm belgeler admin tarafından incelenip onaylanmadan servisçi platformda aktif olamaz.',
  },
  {
    q: 'Şifremi unuttum, ne yapmalıyım?',
    a: 'Giriş ekranında "Şifremi Unuttum" bağlantısına tıkla. Kayıtlı telefonuna SMS kodu gönderilir, kodu doğrulayınca yeni şifreni belirleyebilirsin.',
  },
  {
    q: 'Bildirimler gelmiyor?',
    a: 'Ayarlar > Bildirim İzni bölümünden izin ver. iOS için Ayarlar > Bindi > Bildirimler açık olmalı. Yine gelmiyorsa çıkış yapıp tekrar giriş dene.',
  },
];

export default function YardimScreen() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Yardım & SSS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <Pressable
              key={i}
              onPress={() => setOpen(isOpen ? null : i)}
              style={styles.item}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.q}>{f.q}</Text>
                <Text style={styles.chev}>{isOpen ? '−' : '+'}</Text>
              </View>
              {isOpen && <Text style={styles.a}>{f.a}</Text>}
            </Pressable>
          );
        })}

        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>Cevabını bulamadın mı?</Text>
          <Pressable
            onPress={() => router.push('/(auth)/destek')}
            style={styles.contactBtn}
          >
            <Text style={styles.contactBtnText}>Destek ile İletişime Geç</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { marginBottom: 8 },
  backText: { fontSize: 24, color: colors.dark },
  title: { fontSize: 22, fontWeight: '800', color: colors.dark, letterSpacing: -0.3 },
  scroll: { padding: 20, gap: 8 },
  item: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  q: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
    lineHeight: 20,
  },
  chev: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.muted,
    width: 20,
    textAlign: 'center',
  },
  a: {
    marginTop: 10,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },
  contactBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark,
  },
  contactBtn: {
    marginTop: 10,
    backgroundColor: colors.dark,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  contactBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});
