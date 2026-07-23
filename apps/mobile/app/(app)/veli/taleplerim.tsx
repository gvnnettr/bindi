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

interface ParentOfferInList {
  id: string;
  monthlyPrice: string;
  status: 'pending' | 'selected' | 'rejected';
  provider: { id: string; companyName: string };
}

interface ParentRequestRaw {
  id: string;
  status: 'open' | 'closed' | 'cancelled';
  city: string;
  district: string;
  neighborhood: string | null;
  createdAt: string;
  students: Array<{ name: string; school: string | null }>;
  offers: ParentOfferInList[];
}

interface ParentRequest {
  id: string;
  status: 'open' | 'closed' | 'cancelled';
  city: string;
  district: string;
  neighborhood: string | null;
  createdAt: string;
  offerCount: number;
  selectedOffer: ParentOfferInList | null;
  students: Array<{ name: string; school: string | null }>;
}

function transformRequest(r: ParentRequestRaw): ParentRequest {
  const sel = r.offers.find((o) => o.status === 'selected') ?? null;
  return {
    id: r.id,
    status: r.status,
    city: r.city,
    district: r.district,
    neighborhood: r.neighborhood,
    createdAt: r.createdAt,
    offerCount: r.offers.length,
    selectedOffer: sel,
    students: r.students,
  };
}

type Tab = 'open' | 'closed' | 'cancelled';

function dateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function TaleplerimScreen() {
  const { token } = useAuth();
  const [rows, setRows] = useState<ParentRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('open');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<ParentRequestRaw[]>('/me/parent/requests', token);
      setRows(r.map(transformRequest));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => rows.filter((r) => r.status === tab), [rows, tab]);
  const counts = useMemo(() => ({
    open: rows.filter((r) => r.status === 'open').length,
    closed: rows.filter((r) => r.status === 'closed').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
  }), [rows]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Taleplerim</Text>
        <Text style={styles.sub}>Servis arayışlarımın durumu</Text>
      </View>

      <View style={styles.tabRow}>
        <TabChip label="Aktif" active={tab === 'open'} count={counts.open} onPress={() => setTab('open')} />
        <TabChip label="Tamamlanan" active={tab === 'closed'} count={counts.closed} onPress={() => setTab('closed')} />
        <TabChip label="İptal" active={tab === 'cancelled'} count={counts.cancelled} onPress={() => setTab('cancelled')} />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {tab === 'open' ? 'Aktif talep yok' : tab === 'closed' ? 'Kapanan talep yok' : 'İptal ettiğin talep yok'}
            </Text>
            {tab === 'open' && (
              <Pressable onPress={() => router.push('/(app)/veli/talep-ac')} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>+ Yeni Talep Aç</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/veli/talep/${item.id}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.school} numberOfLines={1}>
                  {item.students[0]?.school ?? 'Okul belirtilmemiş'}
                </Text>
                <Text style={styles.loc}>
                  {item.city} · {item.district}
                  {item.neighborhood ? ` · ${item.neighborhood}` : ''}
                </Text>
              </View>
              <Text style={styles.date}>{dateStr(item.createdAt)}</Text>
            </View>

            {item.selectedOffer && (
              <View style={styles.selBar}>
                <Text style={styles.selLabel}>Seçtiğin servisçi</Text>
                <Text style={styles.selName} numberOfLines={1}>{item.selectedOffer.provider.companyName}</Text>
                <Text style={styles.selPrice}>₺{Number(item.selectedOffer.monthlyPrice).toLocaleString('tr-TR')} /ay</Text>
              </View>
            )}

            {item.status === 'open' && !item.selectedOffer && (
              <View style={styles.offerBar}>
                <View style={styles.offerCount}>
                  <Text style={styles.offerCountText}>{item.offerCount}</Text>
                </View>
                <Text style={styles.offerText}>
                  {item.offerCount > 0 ? `${item.offerCount} teklif geldi` : 'Teklif bekleniyor'}
                </Text>
                <Text style={styles.chev}>›</Text>
              </View>
            )}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 6 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  tabText: { fontSize: 11, fontWeight: '700', color: colors.dark },
  tabTextActive: { color: '#fff' },
  tabCount: { fontWeight: '500' },
  errorBox: {
    marginHorizontal: 20,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  school: { fontSize: 14, fontWeight: '800', color: colors.dark },
  loc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  date: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  selBar: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  selLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selName: { fontSize: 13, fontWeight: '800', color: '#065F46', marginTop: 2 },
  selPrice: { fontSize: 12, color: '#065F46', marginTop: 2, fontWeight: '600' },
  offerBar: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offerCount: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerCountText: { fontSize: 12, fontWeight: '800', color: colors.dark },
  offerText: { flex: 1, fontSize: 12, color: colors.dark, fontWeight: '700' },
  chev: { fontSize: 20, color: colors.muted },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.dark,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
