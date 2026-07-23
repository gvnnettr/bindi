import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../src/theme/colors';

const SUPPORT_PHONE = '+905551112233'; // TODO: settings'ten al
const SUPPORT_EMAIL = 'destek@bindi.com.tr';

export default function DestekScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>

        <Text style={styles.title}>Destek</Text>
        <Text style={styles.sub}>
          Hafta içi 09:00–18:00 arasında yanıt veriyoruz. Aşağıdan en hızlı olanı seç.
        </Text>

        <View style={styles.cards}>
          <ContactCard
            title="WhatsApp ile yaz"
            desc="En hızlı yanıt. Sohbet geçmişi kaybolmaz."
            accent="#25D366"
            icon={
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="#fff">
                <Path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.97L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.52 14.02c-.24.66-1.41 1.28-1.95 1.35-.52.07-1.13.1-1.81-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.8-4.14-4.94-4.33-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.11 1-2.39.26-.28.58-.36.77-.36h.55c.18 0 .42-.07.66.5.24.6.82 2.05.9 2.19.07.15.13.32.03.51-.1.19-.15.31-.29.48-.14.17-.31.38-.44.5-.15.15-.3.31-.13.6.17.29.75 1.24 1.61 2 1.11.98 2.04 1.29 2.33 1.44.29.14.46.12.63-.07.17-.19.72-.83.91-1.11.19-.28.38-.24.65-.14.27.09 1.7.8 2 .95.29.14.49.21.56.34.07.13.07.76-.17 1.42z" />
              </Svg>
            }
            onPress={() => Linking.openURL(`whatsapp://send?phone=${SUPPORT_PHONE.replace('+', '')}`)}
          />
          <ContactCard
            title="Telefon ile ara"
            desc={SUPPORT_PHONE}
            accent={colors.primary}
            icon={
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.dark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </Svg>
            }
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          />
          <ContactCard
            title="E-posta gönder"
            desc={SUPPORT_EMAIL}
            accent={colors.blue}
            icon={
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 4h16c1 0 2 1 2 2v12c0 1-1 2-2 2H4c-1 0-2-1-2-2V6c0-1 1-2 2-2z" />
                <Path d="M22 6l-10 7L2 6" />
              </Svg>
            }
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function ContactCard({
  title,
  desc,
  accent,
  icon,
  onPress,
}: {
  title: string;
  desc: string;
  accent: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
    >
      <View style={[styles.cardIcon, { backgroundColor: accent }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>
      <Text style={styles.chev}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, padding: 24 },
  back: { marginBottom: 12 },
  backText: { fontSize: 24, color: colors.dark },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 6,
    lineHeight: 19,
  },
  cards: { marginTop: 24, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.dark },
  cardDesc: { fontSize: 12, color: colors.muted, marginTop: 2 },
  chev: { fontSize: 20, color: colors.muted },
});
