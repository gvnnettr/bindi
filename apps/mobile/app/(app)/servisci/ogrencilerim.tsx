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
import { useTakipPaket } from '../../../src/hooks/useTakipPaket';
import { TakipGate } from '../../../src/components/TakipGate';
import { colors } from '../../../src/theme/colors';

interface Enrollment {
  id: string;
  status: 'active' | 'ended';
  monthlyPrice: number;
  startMonth: string;
  student: {
    id: string;
    name: string;
    class: string | null;
    school: { id: string; name: string } | null;
  };
  parent: { id: string; name: string; phone: string };
  vehicle: { id: string; brand: string; model: string; plate: string } | null;
}

export default function OgrencilerimScreen() {
  const { active } = useTakipPaket();
  return (
    <TakipGate
      active={active}
      featureName="Öğrencilerim"
      featureDesc="Öğrenci, veli ve ödeme takibini tek yerden yönetmek için Takip Paketi'ne ihtiyacın var."
    >
      <OgrencilerContent />
    </TakipGate>
  );
}

function OgrencilerContent() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'ended'>('active');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const e = await api.get<Enrollment[]>('/me/enrollments', token);
      setRows(e);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => rows.filter((r) => r.status === filter), [rows, filter]);
  const counts = useMemo(() => ({
    active: rows.filter((r) => r.status === 'active').length,
    ended: rows.filter((r) => r.status === 'ended').length,
  }), [rows]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Öğrencilerim</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.tabRow}>
        <TabChip label="Aktif" active={filter === 'active'} count={counts.active} onPress={() => setFilter('active')} />
        <TabChip label="Bitti" active={filter === 'ended'} count={counts.ended} onPress={() => setFilter('ended')} />
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{filter === 'active' ? 'Aktif öğrenci yok' : 'Biten kayıt yok'}</Text>
            <Text style={styles.emptySub}>Kazandığın işlerdeki öğrenciler buraya otomatik eklenir.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/servisci/ogrenci/${item.id}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.student.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.student.name}</Text>
              <Text style={styles.meta}>
                {item.student.class ?? '—'}
                {item.student.school ? ` · ${item.student.school.name}` : ''}
              </Text>
              <Text style={styles.parent}>Veli: {item.parent.name}</Text>
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.price}>₺{item.monthlyPrice.toLocaleString('tr-TR')}</Text>
              <Text style={styles.priceUnit}>/ay</Text>
            </View>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  back: { padding: 6, width: 32 },
  backText: { fontSize: 24, color: colors.dark },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  tabText: { fontSize: 11, fontWeight: '700', color: colors.dark },
  tabTextActive: { color: '#fff' },
  tabCount: { fontWeight: '500' },
  errorBox: { marginHorizontal: 20, padding: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 10 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },
  list: { padding: 20, paddingTop: 4, gap: 10, flexGrow: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.dark },
  name: { fontSize: 14, fontWeight: '800', color: colors.dark },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  parent: { fontSize: 11, color: colors.muted, marginTop: 3 },
  priceCol: { alignItems: 'flex-end' },
  price: { fontSize: 15, fontWeight: '800', color: colors.dark },
  priceUnit: { fontSize: 9, color: colors.muted, fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },
});
