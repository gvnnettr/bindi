import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api, ApiError } from '../api/client';
import { useAuth } from '../state/auth';
import { colors } from '../theme/colors';

interface Props {
  active: boolean | null;
  children: React.ReactNode;
  featureName: string;
  featureDesc: string;
}

export function TakipGate({ active, children, featureName, featureDesc }: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  if (active === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  if (active) return <>{children}</>;

  async function requestInterest() {
    setLoading(true);
    try {
      await api.post('/me/subscription/takip/interest', {}, token);
      Alert.alert(
        'Talep alındı',
        'Takip Paketi ile ilgili talebini aldık. Ekibimiz en kısa sürede iletişime geçecek.',
        [{ text: 'Tamam' }],
      );
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Takip Paketi</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🔒</Text>
        </View>
        <Text style={styles.title}>{featureName}</Text>
        <Text style={styles.sub}>{featureDesc}</Text>
        <View style={styles.divider} />

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Takip Paketi'nde neler var?</Text>
          <FeatureRow label="Öğrenci ve veli CRM'i" />
          <FeatureRow label="Aylık ödeme takibi + dekont onayı" />
          <FeatureRow label="Şoför yönetimi ve belge takibi" />
          <FeatureRow label="Kazanç raporu (12 ay grafik)" />
          <FeatureRow label="Otomatik ödeme hatırlatmaları" />
          <FeatureRow label="Belge son kullanma bildirimleri" />
        </View>

        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>Aylık</Text>
          <Text style={styles.priceValue}>₺450</Text>
          <Text style={styles.priceHint}>+ KDV</Text>
        </View>

        <Pressable
          onPress={requestInterest}
          disabled={loading}
          style={({ pressed }) => [styles.cta, (pressed || loading) && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaText}>{loading ? 'Gönderiliyor...' : 'Bilgi Al'}</Text>
        </Pressable>
        <Text style={styles.note}>Talep aldığımızda ekibimiz iletişime geçer, dekontla ödeme sonrası hemen aktifleşir.</Text>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  back: { padding: 6, width: 32 },
  backText: { fontSize: 24, color: colors.dark },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  body: { flex: 1, padding: 24, alignItems: 'center' },
  iconBox: {
    width: 90, height: 90, borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 12,
  },
  iconEmoji: { fontSize: 40 },
  title: { fontSize: 22, fontWeight: '800', color: colors.dark, marginTop: 20, letterSpacing: -0.5, textAlign: 'center' },
  sub: { fontSize: 13, color: colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  divider: { width: 40, height: 2, backgroundColor: colors.border, marginTop: 20, marginBottom: 20 },
  features: {
    width: '100%',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuresTitle: { fontSize: 12, fontWeight: '800', color: colors.dark, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  check: { color: colors.success, fontWeight: '800', fontSize: 14 },
  featureText: { fontSize: 12, color: colors.dark, flex: 1 },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
    width: '100%',
    justifyContent: 'center',
  },
  priceLabel: { fontSize: 12, color: colors.dark, fontWeight: '700' },
  priceValue: { fontSize: 32, fontWeight: '800', color: colors.dark, letterSpacing: -1 },
  priceHint: { fontSize: 11, color: colors.dark, fontWeight: '600' },
  cta: {
    marginTop: 16, width: '100%',
    backgroundColor: colors.dark, paddingVertical: 15, borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  note: { fontSize: 10, color: colors.muted, textAlign: 'center', marginTop: 10, lineHeight: 15, maxWidth: 300 },
});
