import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api, ApiError } from '../../src/api/client';
import { useAuth } from '../../src/state/auth';
import { colors } from '../../src/theme/colors';

interface MeResp {
  id: string;
  companyName: string;
  status: 'pending_payment' | 'pending_approval' | 'active' | 'suspended';
}

/**
 * Servisçi onay bekleniyor gate ekranı.
 * status='pending_approval' iken burada tutulur.
 * status='active' olunca ana ekrana yönlenir.
 * "Belgelerimi yükle" butonu belgelerim ekranına gider.
 * "Çıkış" butonu logout + login ekranına döner.
 */
export default function ServisciOnayBekleniyorScreen() {
  const { token, logout } = useAuth();
  const [companyName, setCompanyName] = useState('...');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!token) return;
    try {
      const me = await api.get<MeResp>('/me/provider', token);
      setCompanyName(me.companyName);
      if (me.status === 'active') {
        // Onaylandı → ana ekrana
        router.replace('/(app)/servisci');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void checkStatus(); }, [checkStatus]));

  async function onRefresh() {
    setRefreshing(true);
    await checkStatus();
    setRefreshing(false);
  }

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/rol');
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#93C5FD', '#3B82F6', '#1E40AF']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.3, y: 0.25 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView edges={['top']} style={styles.heroInner}>
          <Image
            source={require('../../assets/bindi-logo.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        <View style={styles.iconBig}>
          <Text style={styles.iconEmoji}>⏳</Text>
        </View>

        <Text style={styles.title}>Onay Bekleniyor</Text>
        <Text style={styles.sub}>
          <Text style={styles.company}>{companyName}</Text> hesabınız için başvurunuz alındı.
        </Text>

        <View style={styles.stepsCard}>
          <StepRow
            done
            title="Kayıt tamamlandı"
            desc="Şirket bilgileriniz kaydedildi"
          />
          <StepRow
            done
            title="Telefon doğrulandı"
            desc="SMS ile numaranız onaylandı"
          />
          <StepRow
            active
            title="Belge kontrolü"
            desc="Ekibimiz K1 belgeniz, ehliyet, ruhsat vb. inceleyecek"
          />
          <StepRow
            title="Hesap aktif"
            desc="Onay sonrası taleplere teklif verebilirsin"
          />
        </View>

        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Süreci hızlandır 🚀</Text>
          <Text style={styles.ctaText}>
            Belgelerini şimdi yüklersen onay 24 saat içinde gelir.
            Yüklemezsen ekibimiz seninle iletişime geçecek.
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/servisci/belgelerim')}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.ctaBtnText}>📄 Belgelerimi Yükle</Text>
          </Pressable>
        </View>

        <Pressable onPress={onRefresh} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>🔄 Durumu kontrol et</Text>
        </Pressable>

        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

function StepRow({
  done,
  active,
  title,
  desc,
}: {
  done?: boolean;
  active?: boolean;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={[
        styles.stepDot,
        done && styles.stepDotDone,
        active && styles.stepDotActive,
      ]}>
        {done ? (
          <Text style={styles.stepCheck}>✓</Text>
        ) : active ? (
          <View style={styles.stepPulse} />
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[
          styles.stepTitle,
          !done && !active && styles.stepTitlePending,
        ]}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingBottom: 20 },
  heroInner: { padding: 16, alignItems: 'center' },
  heroLogo: { width: 140, height: 60 },
  body: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  iconBig: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  iconEmoji: { fontSize: 48 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  company: { color: colors.dark, fontWeight: '700' },

  stepsCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepDotActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  stepCheck: { color: '#fff', fontWeight: '900', fontSize: 14 },
  stepPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.dark,
  },
  stepTitle: { fontWeight: '700', color: colors.dark, fontSize: 14 },
  stepTitlePending: { color: colors.muted },
  stepDesc: { fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 16 },

  ctaCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ctaTitle: { fontSize: 15, fontWeight: '800', color: colors.dark, marginBottom: 6 },
  ctaText: {
    fontSize: 12,
    color: colors.dark,
    lineHeight: 18,
    marginBottom: 12,
  },
  ctaBtn: {
    backgroundColor: colors.dark,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  refreshBtn: { marginTop: 24, padding: 10 },
  refreshText: { color: colors.blue, fontWeight: '700', fontSize: 13 },
  logoutBtn: { marginTop: 8, padding: 10 },
  logoutText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  error: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 8,
    textAlign: 'center',
  },
});
