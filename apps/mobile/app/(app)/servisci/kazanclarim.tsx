import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { colors } from '../../../src/theme/colors';

interface Dashboard {
  pendingOffers: number;
  wonOffers: number;
  activeMonthlyRevenue: number;
  avgRating: number;
  totalReviews: number;
  newRequestsToday: number;
}

interface ProviderInfo {
  id: string;
  companyName: string;
  ownerName: string;
  status: string;
}

function formatMoney(n: number): string {
  return '₺' + n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

function ratingStars(avg: number): string {
  const full = Math.round(avg);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

export default function KazanclarScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [me, setMe] = useState<ProviderInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [d, m] = await Promise.all([
        api.get<Dashboard>('/me/dashboard', token),
        api.get<ProviderInfo>('/me', token),
      ]);
      setData(d);
      setMe(m);
      setError(null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg);
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
        colors={['#FFE28A', colors.primary, '#E1A800']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.3, y: 0.25 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView edges={['top']} style={styles.heroInner}>
          <View style={styles.heroTop}>
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Image
              source={require('../../../assets/bindi-logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <View style={styles.heroTopRight}>
              <Text style={styles.heroGreet}>Merhaba,</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {me?.ownerName?.split(' ')[0] ?? '—'}
              </Text>
            </View>
          </View>

          <View style={styles.revenueBox}>
            <Text style={styles.revenueLabel}>Aktif Aylık Ciro</Text>
            <Text style={styles.revenue}>
              {data ? formatMoney(data.activeMonthlyRevenue) : '—'}
            </Text>
            <Text style={styles.revenueSub}>
              {data?.wonOffers ?? '—'} aktif iş üzerinden
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.statGrid}>
          <StatCard
            label="Yeni Talep"
            value={data?.newRequestsToday}
            sub="Son 24 saat"
            accent={colors.blue}
            icon={
              <Path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            }
          />
          <StatCard
            label="Bekleyen Teklif"
            value={data?.pendingOffers}
            sub="Verilen ama yanıt bekleyen"
            accent={colors.warning}
            icon={
              <Path d="M12 8v4l3 3M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />
            }
          />
          <StatCard
            label="Kazanılan İş"
            value={data?.wonOffers}
            sub="Tüm zamanlar"
            accent={colors.success}
            icon={
              <Path d="M20 6L9 17l-5-5" />
            }
          />
          <StatCard
            label="Puanım"
            value={data?.avgRating.toFixed(1)}
            sub={`${data?.totalReviews ?? 0} yorum`}
            accent={colors.primary}
            icon={
              <Path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
            }
          />
        </View>

        {data && data.totalReviews > 0 && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingCardLabel}>Genel Puan</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingBig}>{data.avgRating.toFixed(1)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.ratingStars}>{ratingStars(data.avgRating)}</Text>
                <Text style={styles.ratingSub}>{data.totalReviews} veli değerlendirmesi</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bugünkü İpucu</Text>
          <Text style={styles.cardBody}>
            Teklif verirken açıklama alanını doldur — velilere aynı fiyattaki teklifler arasında seni öne çıkarır.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

interface StatProps {
  label: string;
  value: number | string | undefined;
  sub: string;
  accent: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, sub, accent, icon }: StatProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: accent + '22' }]}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </Svg>
      </View>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingBottom: 20 },
  heroInner: { paddingHorizontal: 20, paddingTop: 8 },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroLogo: { width: 120, height: 54 },
  back: { padding: 4 },
  backText: { fontSize: 24, color: colors.dark, fontWeight: '700' },
  heroTopRight: { alignItems: 'flex-end' },
  heroGreet: { fontSize: 11, color: 'rgba(31,41,55,0.7)', fontWeight: '600' },
  heroName: { fontSize: 15, fontWeight: '800', color: colors.dark, maxWidth: 160 },
  revenueBox: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  revenueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(31,41,55,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  revenue: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.dark,
    marginTop: 4,
    letterSpacing: -1,
  },
  revenueSub: { fontSize: 12, color: colors.dark, marginTop: 2, opacity: 0.7 },
  body: { padding: 20, paddingBottom: 40 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: '700', color: colors.dark, marginTop: 2 },
  statSub: { fontSize: 10, color: colors.muted, marginTop: 2 },
  ratingCard: {
    marginTop: 16,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ratingBig: { fontSize: 42, fontWeight: '800', color: colors.dark, letterSpacing: -1 },
  ratingStars: { fontSize: 18, color: colors.primary, letterSpacing: 2 },
  ratingSub: { fontSize: 12, color: colors.muted, marginTop: 4 },
  card: {
    marginTop: 16,
    backgroundColor: colors.primarySoft,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#78350F', marginBottom: 6 },
  cardBody: { fontSize: 12, color: '#78350F', lineHeight: 18 },
});
