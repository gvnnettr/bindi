import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../../src/api/client';
import { useAuth } from '../../../../src/state/auth';
import { NotificationBell } from '../../../../src/components/NotificationBell';
import { colors } from '../../../../src/theme/colors';

interface ProviderMe {
  id: string;
  companyName: string;
  ownerName: string;
  status: string;
}

interface Dashboard {
  pendingOffers: number;
  wonOffers: number;
  activeMonthlyRevenue: number;
  avgRating: number;
  totalReviews: number;
  newRequestsToday: number;
}

interface PaymentItem {
  id: string;
  status: string;
}

export default function ServisciAnaSayfa() {
  const { token } = useAuth();
  const [me, setMe] = useState<ProviderMe | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [m, d] = await Promise.all([
        api.get<ProviderMe>('/me/provider', token),
        api.get<Dashboard>('/me/dashboard', token).catch(() => null),
      ]);
      setMe(m);
      setDashboard(d);
      // Ödeme durumu (Takip Paketi olmayan servisçilerde de artık açık)
      try {
        const payments = await api.get<PaymentItem[]>('/me/payments', token);
        setSubmittedCount(payments.filter((p) => p.status === 'submitted').length);
        setPendingPaymentsCount(payments.filter((p) => p.status === 'pending' || p.status === 'late').length);
      } catch {}
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreet}>Merhaba,</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {me?.companyName ?? '—'}
              </Text>
            </View>
            <NotificationBell color="#fff" />
          </View>

          {/* KPI row */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiNum}>{dashboard?.newRequestsToday ?? '—'}</Text>
              <Text style={styles.kpiLabel}>Bugün Talep</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiNum}>{dashboard?.pendingOffers ?? '—'}</Text>
              <Text style={styles.kpiLabel}>Bekleyen Teklif</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiNum}>{dashboard?.wonOffers ?? '—'}</Text>
              <Text style={styles.kpiLabel}>Kazandığım</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
      >
        {error && <Text style={styles.errorText}>{error}</Text>}

        {me?.status === 'suspended' && (
          <View style={styles.warnBox}>
            <Text style={styles.warnIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle}>Hesabınız Askıya Alındı</Text>
              <Text style={styles.warnBody}>
                Yeni talep gelmiyor, teklif veremezsiniz. Bilgi için destek@bindi.com.tr
              </Text>
            </View>
          </View>
        )}

        {submittedCount > 0 && (
          <Pressable
            onPress={() => router.push('/(app)/servisci/kazanc-raporu')}
            style={({ pressed }) => [styles.alertCard, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.alertIcon}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{submittedCount} bekleyen dekont</Text>
              <Text style={styles.alertSub}>Velilerin gönderdiği dekontları onayla</Text>
            </View>
            <Text style={styles.alertArrow}>›</Text>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>İşlemler</Text>

        <View style={styles.grid}>
          <ActionCard
            emoji="📋"
            title="Talepler"
            desc={`${dashboard?.newRequestsToday ?? 0} bugün gelen`}
            onPress={() => router.push('/(app)/servisci/talepler')}
          />
          <ActionCard
            emoji="📤"
            title="Tekliflerim"
            desc={`${dashboard?.pendingOffers ?? 0} bekleyen`}
            onPress={() => router.push('/(app)/servisci/tekliflerim')}
          />
          <ActionCard
            emoji="💰"
            title="Ödemeler"
            desc={`${pendingPaymentsCount} bekliyor`}
            onPress={() => router.push('/(app)/servisci/kazanc-raporu')}
          />
          <ActionCard
            emoji="⭐"
            title="Puanlarım"
            desc={dashboard?.totalReviews ? `${dashboard.avgRating.toFixed(1)} · ${dashboard.totalReviews} yorum` : 'Henüz yorum yok'}
            onPress={() => router.push('/(app)/servisci/puanlarim')}
          />
          <ActionCard
            emoji="🚐"
            title="Araçlarım"
            desc="Araç yönetimi"
            onPress={() => router.push('/(app)/servisci/araclarim')}
          />
          <ActionCard
            emoji="👤"
            title="Şoförlerim"
            desc="Şoför yönetimi"
            onPress={() => router.push('/(app)/servisci/soforlerim')}
          />
          <ActionCard
            emoji="📍"
            title="Konum / Bölge"
            desc="Hizmet çemberim"
            onPress={() => router.push('/(app)/servisci/bolgelerim')}
          />
          <ActionCard
            emoji="📄"
            title="Belgelerim"
            desc="K1, sigorta, ehliyet"
            onPress={() => router.push('/(app)/servisci/belgelerim')}
          />
        </View>

        <Text style={styles.sectionTitle}>Öğrencilerim & Rota</Text>
        <View style={styles.grid}>
          <ActionCard
            emoji="👨‍🎓"
            title="Öğrencilerim"
            desc="Aktif servis çocukları"
            onPress={() => router.push('/(app)/servisci/ogrencilerim')}
          />
          <ActionCard
            emoji="🗺️"
            title="Rota / Servis"
            desc="Bugünkü rota"
            onPress={() => router.push('/(app)/servisci/servis')}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function ActionCard({
  emoji,
  title,
  desc,
  onPress,
}: {
  emoji: string;
  title: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
    >
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDesc}>{desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingBottom: 20 },
  heroInner: { paddingHorizontal: 20, paddingTop: 8 },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroGreet: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  kpiNum: { fontSize: 24, fontWeight: '800', color: '#fff' },
  kpiLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2, textAlign: 'center' },

  body: { padding: 16, paddingBottom: 40 },
  errorText: { color: colors.danger, fontSize: 12, textAlign: 'center', padding: 12 },

  warnBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F87171',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  warnIcon: { fontSize: 24 },
  warnTitle: { fontSize: 14, fontWeight: '800', color: colors.danger },
  warnBody: { fontSize: 12, color: '#7F1D1D', marginTop: 4, lineHeight: 18 },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
    marginBottom: 12,
  },
  alertIcon: { fontSize: 28 },
  alertTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  alertSub: { fontSize: 12, color: colors.dark, marginTop: 2, opacity: 0.8 },
  alertArrow: { fontSize: 24, color: colors.dark, fontWeight: '700' },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48%',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
  },
  actionEmoji: { fontSize: 26, marginBottom: 8 },
  actionTitle: { fontSize: 14, fontWeight: '800', color: colors.dark },
  actionDesc: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
