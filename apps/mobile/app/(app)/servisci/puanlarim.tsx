import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { colors } from '../../../src/theme/colors';

interface ReviewsStats {
  avg: number;
  total: number;
  distribution: Array<{ rating: number; count: number }>;
  recent: Array<{
    rating: number;
    comment: string | null;
    createdAt: string;
    parentName: string;
  }>;
}

function stars(n: number, size = 18) {
  return (
    <Text style={{ fontSize: size, color: colors.primary, letterSpacing: 1 }}>
      {'★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))}
    </Text>
  );
}

function dateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PuanlarimScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<ReviewsStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<ReviewsStats>('/me/reviews/stats', token);
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

  const maxCount = Math.max(1, ...(data?.distribution.map((d) => d.count) ?? []));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Puanlarım</Text>
        <View style={{ width: 32 }} />
      </View>

      {!data ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.muted} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        >
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.topCard}>
            <View style={styles.topLeft}>
              <Text style={styles.avgBig}>{data.avg.toFixed(1)}</Text>
              {stars(data.avg, 22)}
              <Text style={styles.totalText}>{data.total} veli puanladı</Text>
            </View>
            <View style={styles.topRight}>
              {data.distribution.map((d) => (
                <View key={d.rating} style={styles.distRow}>
                  <Text style={styles.distNum}>{d.rating}</Text>
                  <Text style={styles.distStar}>★</Text>
                  <View style={styles.distBar}>
                    <View
                      style={[
                        styles.distFill,
                        { width: `${Math.max(2, (d.count / maxCount) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.distCount}>{d.count}</Text>
                </View>
              ))}
            </View>
          </View>

          {data.total === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Henüz puan almadın</Text>
              <Text style={styles.emptySub}>Veliler seçtikleri servisçileri puanlar. İlk işi kazandığında puan almaya başlarsın.</Text>
            </View>
          )}

          {data.recent.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Son Yorumlar</Text>
              {data.recent.map((r, i) => (
                <View key={i} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewName}>{r.parentName}</Text>
                      <Text style={styles.reviewDate}>{dateStr(r.createdAt)}</Text>
                    </View>
                    {stars(r.rating, 14)}
                  </View>
                  {r.comment ? (
                    <Text style={styles.reviewComment}>{r.comment}</Text>
                  ) : (
                    <Text style={styles.reviewNoComment}>(Yorum yazılmadı)</Text>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  back: { padding: 6, width: 32 },
  backText: { fontSize: 24, color: colors.dark },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.dark, letterSpacing: -0.2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, gap: 10 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },
  topCard: {
    flexDirection: 'row',
    gap: 20,
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingRight: 20,
  },
  topRight: { flex: 1, justifyContent: 'center', gap: 4 },
  avgBig: { fontSize: 44, fontWeight: '800', color: colors.dark, letterSpacing: -1 },
  totalText: { fontSize: 11, color: colors.muted, marginTop: 4, fontWeight: '600' },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distNum: { fontSize: 11, fontWeight: '800', color: colors.dark, width: 8 },
  distStar: { fontSize: 11, color: colors.primary },
  distBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  distCount: { fontSize: 10, color: colors.muted, width: 20, textAlign: 'right', fontWeight: '600' },
  emptyBox: {
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
  },
  reviewCard: {
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  reviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  reviewName: { fontSize: 13, fontWeight: '700', color: colors.dark },
  reviewDate: { fontSize: 10, color: colors.muted, marginTop: 2 },
  reviewComment: { fontSize: 12, color: colors.dark, lineHeight: 18 },
  reviewNoComment: { fontSize: 11, color: colors.muted, fontStyle: 'italic' },
});
