import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { colors } from '../../../src/theme/colors';

interface OfferRow {
  id: string;
  monthlyPrice: string;
  note: string | null;
  status: 'pending' | 'selected' | 'rejected';
  selectedAt: string | null;
  createdAt: string;
  request: {
    id: string;
    city: string;
    district: string;
    neighborhood: string | null;
    students: Array<{ name: string; class: string | null; school: { name: string } | null }>;
  };
  vehicle: { id: string; brand: string; model: string; plate: string } | null;
}

type Tab = 'all' | 'pending' | 'selected' | 'rejected';

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const min = Math.floor((now - then) / 60000);
  if (min < 60) return `${Math.max(1, min)} dk önce`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} saat önce`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} gün önce`;
  return `${Math.floor(day / 30)} ay önce`;
}

export default function TekliflerimScreen() {
  const { token } = useAuth();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('all');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<OfferRow[]>('/me/offers', token);
      setOffers(r);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    if (tab === 'all') return offers;
    return offers.filter((o) => o.status === tab);
  }, [offers, tab]);

  const counts = useMemo(() => ({
    all: offers.length,
    pending: offers.filter((o) => o.status === 'pending').length,
    selected: offers.filter((o) => o.status === 'selected').length,
    rejected: offers.filter((o) => o.status === 'rejected').length,
  }), [offers]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tekliflerim</Text>
        <Text style={styles.sub}>Verdiğin tekliflerin durumu</Text>
      </View>

      <View style={styles.tabRow}>
        <TabChip label="Tümü" active={tab === 'all'} count={counts.all} onPress={() => setTab('all')} />
        <TabChip label="Bekleyen" active={tab === 'pending'} count={counts.pending} onPress={() => setTab('pending')} />
        <TabChip label="Kazandığım" active={tab === 'selected'} count={counts.selected} onPress={() => setTab('selected')} />
        <TabChip label="Kaybettiğim" active={tab === 'rejected'} count={counts.rejected} onPress={() => setTab('rejected')} />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {tab === 'all' ? 'Henüz teklif vermedin' : 'Bu kategoride teklif yok'}
            </Text>
            <Text style={styles.emptySub}>
              Talepler sekmesinden yeni işlere teklif verebilirsin.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/servisci/talep/${item.request.id}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.school} numberOfLines={1}>
                  {item.request.students[0]?.school?.name ?? 'Okul belirtilmemiş'}
                </Text>
                <Text style={styles.loc}>
                  {item.request.city} · {item.request.district}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </View>

            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>Aylık Ücret</Text>
                <Text style={styles.price}>₺{Number(item.monthlyPrice).toLocaleString('tr-TR')}</Text>
              </View>
              <View style={styles.metaBox}>
                {item.vehicle && (
                  <Text style={styles.metaText}>
                    {item.vehicle.brand} {item.vehicle.model}
                  </Text>
                )}
                <Text style={styles.metaSub}>{item.request.students.length} öğrenci</Text>
              </View>
            </View>

            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function TabChip({ label, active, count, onPress }: { label: string; active: boolean; count: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
        {count > 0 && <Text style={styles.tabCount}> · {count}</Text>}
      </Text>
    </Pressable>
  );
}

function StatusBadge({ status }: { status: OfferRow['status'] }) {
  const map: Record<OfferRow['status'], { bg: string; border: string; color: string; label: string }> = {
    pending: { bg: '#FEF3C7', border: '#FDE68A', color: '#78350F', label: 'Bekliyor' },
    selected: { bg: colors.successSoft, border: '#A7F3D0', color: '#065F46', label: 'Kazandın' },
    rejected: { bg: '#F3F4F6', border: '#E5E7EB', color: colors.muted, label: 'Seçilmedi' },
  };
  const m = map[status];
  return (
    <View style={[styles.badge, { backgroundColor: m.bg, borderColor: m.border }]}>
      <Text style={[styles.badgeText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
    flexWrap: 'wrap',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  tabText: { fontSize: 11, fontWeight: '700', color: colors.dark },
  tabTextActive: { color: '#fff' },
  tabCount: { fontWeight: '500' },
  errorBox: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
  },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },
  list: { padding: 20, paddingTop: 4, gap: 10, flexGrow: 1 },
  card: {
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  school: { fontSize: 14, fontWeight: '800', color: colors.dark },
  loc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  priceLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  price: { fontSize: 20, fontWeight: '800', color: colors.dark, marginTop: 2 },
  metaBox: { alignItems: 'flex-end' },
  metaText: { fontSize: 11, fontWeight: '700', color: colors.dark },
  metaSub: { fontSize: 10, color: colors.muted, marginTop: 2 },
  time: { fontSize: 10, color: colors.muted, textAlign: 'right', fontWeight: '600' },
  empty: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },
});
