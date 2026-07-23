import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Logo } from '../../src/components/Logo';
import { colors } from '../../src/theme/colors';

export default function RolePicker() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Logo height={90} />
        <Text style={styles.sub}>Hoş geldin</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.heading}>Nasıl devam edeceksin?</Text>
        <Text style={styles.hint}>Rol sonradan değiştirilemez, ama iki hesap açabilirsin.</Text>

        <View style={styles.cardStack}>
          <RoleCard
            label="Veliyim"
            desc="Çocuğum için servis arıyorum. Teklif alacağım, ödemelerimi yapacağım."
            accent={colors.blue}
            icon={
              <Svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={colors.dark} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <Circle cx="12" cy="7" r="4" />
              </Svg>
            }
            onPress={() => router.push('/(auth)/giris?role=parent')}
          />
          <RoleCard
            label="Servisçiyim"
            desc="Talep alacağım, teklif vereceğim. Öğrencilerimi ve ödemeleri takip edeceğim."
            accent={colors.primary}
            icon={
              <Svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={colors.dark} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M8 6v6M16 6v6M6 12h12l1 6H5l1-6zM4 22h16" />
                <Circle cx="8" cy="17" r="1.5" fill={colors.dark} />
                <Circle cx="16" cy="17" r="1.5" fill={colors.dark} />
              </Svg>
            }
            onPress={() => router.push('/(auth)/giris?role=provider')}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Kayıt olmadan önce{' '}
          <Text
            style={styles.link}
            onPress={() => router.push('/(auth)/yardim')}
          >
            yardım merkezine
          </Text>
          {' '}bakabilirsin.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function RoleCard({
  label,
  desc,
  accent,
  icon,
  onPress,
}: {
  label: string;
  desc: string;
  accent: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, { borderLeftColor: accent }]}
      onPress={onPress}
    >
      <View style={[styles.cardIcon, { backgroundColor: accent + '22' }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 18l6-6-6-6" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 12,
    alignItems: 'center',
  },
  brand: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -1.5,
  },
  sub: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 12,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.3,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  cardStack: {
    marginTop: 24,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.dark,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
    lineHeight: 17,
  },
  footer: {
    padding: 24,
  },
  footerText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
  link: {
    color: colors.dark,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
