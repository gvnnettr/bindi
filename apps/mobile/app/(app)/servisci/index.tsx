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
import Svg, { Path } from 'react-native-svg';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { colors } from '../../../src/theme/colors';

interface RequestRow {
  id: string;
  city: string;
  district: string;
  neighborhood: string | null;
  pickupType: string | null;
  notes: string | null;
  createdAt: string;
  distanceKm: number | null;
  etaMin: number | null;
  hasLocation: boolean;
  students: Array<{ name: string; class: string | null; school: { id: string; name: string } | null }>;
  myOffer: { id: string; monthlyPrice: string; status: string } | null;
}

type Filter = 'all' | 'new' | 'offered';

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const min = Math.floor((now - then) / 60000);
  if (min < 1) return 'Az önce';
  if (min < 60) return `${min} dk önce`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} saat önce`;
  const day = Math.floor(hour / 24);
  return `${day} gün önce`;
}

export default function TaleplerScreen() {
  const { token } = useAuth();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<RequestRow[]>('/me/requests', token);
      setRows(r);
      setError(null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    if (filter === 'new') return rows.filter((r) => !r.myOffer);
    if (filter === 'offered') return rows.filter((r) => !!r.myOffer);
    return rows;
  }, [rows, filter]);

  const counts = useMemo(() => ({
    all: rows.length,
    new: rows.filter((r) => !r.myOffer).length,
    offered: rows.filter((r) => !!r.myOffer).length,
  }), [rows]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Talepler</Text>
        <Text style={styles.sub}>Bölgende yeni veli talepleri</Text>
      </View>

      <View style={styles.filterRow}>
        <FilterChip label="Tümü" active={filter === 'all'} count={counts.all} onPress={() => setFilter('all')} />
        <FilterChip label="Yeni" active={filter === 'new'} count={counts.new} onPress={() => setFilter('new')} />
        <FilterChip label="Teklif Verdim" active={filter === 'offered'} count={counts.offered} onPress={() => setFilter('offered')} />
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
              {filter === 'new' ? 'Yeni talep yok' : filter === 'offered' ? 'Teklif vermedin' : 'Talep yok'}
            </Text>
            <Text style={styles.emptySub}>
              Yeni talepler geldiğinde bildirim alacaksın. Bölgeni genişletmek istersen Menü &gt; Ayarlar.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/servisci/talep/${item.id}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSchool} numberOfLines={1}>
                  {item.students[0]?.school?.name ?? 'Okul belirtilmemiş'}
                </Text>
                <Text style={styles.cardLoc}>
                  {item.city} · {item.district}
                  {item.neighborhood ? ` · ${item.neighborhood}` : ''}
                </Text>
              </View>
              {item.myOffer && (
                <View style={[styles.badge, item.myOffer.status === 'selected' ? styles.badgeSuccess : styles.badgeWarning]}>
                  <Text style={[styles.badgeText, item.myOffer.status === 'selected' ? styles.badgeTextSuccess : styles.badgeTextWarning]}>
                    {item.myOffer.status === 'selected' ? 'Kazandın' : 'Teklif verildi'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardMeta}>
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>
                  {item.students.length} öğrenci
                </Text>
              </View>
              {item.pickupType && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaText}>{pickupLabel(item.pickupType)}</Text>
                </View>
              )}
              {item.distanceKm != null && item.etaMin != null && (
                <View style={[styles.metaChip, styles.metaChipHighlight]}>
                  <Text style={[styles.metaText, styles.metaTextHighlight]}>
                    📍 {item.distanceKm} km · ~{item.etaMin} dk
                  </Text>
                </View>
              )}
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>

            {item.myOffer && (
              <View style={styles.priceBar}>
                <Text style={styles.priceLabel}>Verdiğin teklif</Text>
                <Text style={styles.priceValue}>₺{Number(item.myOffer.monthlyPrice).toLocaleString('tr-TR')}/ay</Text>
              </View>
            )}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function pickupLabel(t: string): string {
  const map: Record<string, string> = {
    both: 'Gidiş+Dönüş',
    morning: 'Sabah',
    evening: 'Akşam',
    lunch: 'Öğle',
  };
  return map[t] ?? t;
}

function FilterChip({ label, active, count, onPress }: { label: string; active: boolean; count: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
        {count > 0 && <Text style={styles.chipCount}> · {count}</Text>}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.dark },
  chipTextActive: { color: '#fff' },
  chipCount: { fontWeight: '500' },
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardSchool: { fontSize: 14, fontWeight: '800', color: colors.dark },
  cardLoc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeSuccess: { backgroundColor: colors.successSoft, borderColor: '#A7F3D0' },
  badgeWarning: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeTextSuccess: { color: '#065F46' },
  badgeTextWarning: { color: '#78350F' },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaText: { fontSize: 10, fontWeight: '700', color: colors.dark },
  metaChipHighlight: { backgroundColor: colors.blueSoft, borderColor: '#93C5FD' },
  metaTextHighlight: { color: '#1E40AF' },
  time: { fontSize: 10, color: colors.muted, marginLeft: 'auto', fontWeight: '600' },
  priceBar: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: { fontSize: 11, color: '#78350F', fontWeight: '700' },
  priceValue: { fontSize: 14, color: '#78350F', fontWeight: '800' },
  empty: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },
});
