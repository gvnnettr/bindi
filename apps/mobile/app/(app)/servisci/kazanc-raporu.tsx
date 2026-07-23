import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { useTakipPaket } from '../../../src/hooks/useTakipPaket';
import { TakipGate } from '../../../src/components/TakipGate';
import { colors } from '../../../src/theme/colors';

interface EarningsReport {
  monthly: Array<{ period: string; revenue: number; paymentCount: number }>;
  totalPaid: number;
  pendingAmount: number;
  paidCount: number;
  unpaidCount: number;
}

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function periodLabel(period: string): string {
  const [, m] = period.split('-').map(Number);
  return MONTHS_TR[(m ?? 1) - 1];
}

export default function KazancRaporuScreen() {
  const { active } = useTakipPaket();
  return (
    <TakipGate
      active={active}
      featureName="Kazanç Raporu"
      featureDesc="12 aylık gelir grafiği ve ödeme istatistikleri için Takip Paketi'ne ihtiyacın var."
    >
      <KazancContent />
    </TakipGate>
  );
}

function KazancContent() {
  const { token } = useAuth();
  const [data, setData] = useState<EarningsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<EarningsReport>('/me/earnings/report', token);
      setData(r);
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

  const maxRevenue = Math.max(1, ...(data?.monthly.map((m) => m.revenue) ?? []));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ width: 32 }} />
        <Text style={styles.headerTitle}>Ödemeler</Text>
        <View style={{ width: 32 }} />
      </View>

      {!data ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.muted} />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        >
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Toplam Kazanç (Son 12 Ay)</Text>
            <Text style={styles.heroValue}>₺{data.totalPaid.toLocaleString('tr-TR')}</Text>
            <View style={styles.heroMeta}>
              <Text style={styles.heroSub}>{data.paidCount} ödeme alındı</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Text style={styles.statLabel}>Bekleyen</Text>
              <Text style={[styles.statValue, { color: '#78350F' }]}>₺{data.pendingAmount.toLocaleString('tr-TR')}</Text>
              <Text style={styles.statSub}>{data.unpaidCount} ödeme</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.successSoft, borderColor: '#A7F3D0' }]}>
              <Text style={styles.statLabel}>Ödendi</Text>
              <Text style={[styles.statValue, { color: '#065F46' }]}>{data.paidCount}</Text>
              <Text style={styles.statSub}>işlem</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Aylık Gelir</Text>
          {data.monthly.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Henüz ödeme geliri yok</Text>
              <Text style={styles.emptySub}>Öğrenci kayıtlarından ödemeler geldikçe burada aylık gelir grafiğin oluşacak.</Text>
            </View>
          ) : (
            <View style={styles.chartBox}>
              <View style={styles.chartBars}>
                {data.monthly.map((m) => {
                  const h = (m.revenue / maxRevenue) * 130;
                  return (
                    <View key={m.period} style={styles.barCol}>
                      <View style={styles.barWrap}>
                        <View style={[styles.bar, { height: Math.max(4, h) }]} />
                      </View>
                      <Text style={styles.barLabel}>{periodLabel(m.period)}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.chartLegend}>
                <Text style={styles.legendText}>
                  En yüksek: ₺{maxRevenue.toLocaleString('tr-TR')}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Ay ay detay</Text>
          <View style={styles.detailBox}>
            {data.monthly.length === 0 && <Text style={styles.emptySub}>Kayıt yok</Text>}
            {data.monthly.slice().reverse().map((m) => (
              <View key={m.period} style={styles.detailRow}>
                <Text style={styles.detailPeriod}>{m.period}</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.detailCount}>{m.paymentCount} ödeme</Text>
                <Text style={styles.detailRevenue}>₺{m.revenue.toLocaleString('tr-TR')}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },
  body: { padding: 20, gap: 16 },
  hero: {
    backgroundColor: colors.dark, padding: 20, borderRadius: 20, gap: 4,
  },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { fontSize: 38, fontWeight: '800', color: colors.primary, letterSpacing: -1 },
  heroMeta: { flexDirection: 'row', gap: 12 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  gridRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  statLabel: { fontSize: 11, fontWeight: '800', color: colors.dark, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7 },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  statSub: { fontSize: 10, color: colors.dark, opacity: 0.7, marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  chartBox: {
    padding: 16, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  chartBars: {
    flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 6, justifyContent: 'space-between',
  },
  barCol: { alignItems: 'center', flex: 1, gap: 6 },
  barWrap: { height: 130, justifyContent: 'flex-end' },
  bar: {
    width: 18, backgroundColor: colors.primary, borderRadius: 4,
  },
  barLabel: { fontSize: 9, color: colors.muted, fontWeight: '700' },
  chartLegend: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  legendText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  detailBox: {
    padding: 14, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailPeriod: { fontSize: 12, fontWeight: '800', color: colors.dark, width: 65 },
  detailCount: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  detailRevenue: { fontSize: 13, fontWeight: '800', color: colors.dark, minWidth: 80, textAlign: 'right' },
  emptyBox: {
    padding: 30, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },
});
