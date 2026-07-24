import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../src/api/client';
import { useAuth } from '../../src/state/auth';
import { colors } from '../../src/theme/colors';

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return 'Az önce';
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR');
}

function typeIcon(type: string): string {
  if (type.startsWith('payment')) return '💳';
  if (type.startsWith('offer')) return '📩';
  if (type.startsWith('request')) return '📋';
  if (type.startsWith('provider.activated')) return '✅';
  if (type.startsWith('provider.suspended')) return '⚠️';
  if (type.startsWith('trip')) return '🚐';
  if (type.startsWith('driver')) return '👤';
  return '🔔';
}

export default function BildirimlerScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<NotifItem[]>('/me/notifications', token);
      setItems(r);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoaded(true);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function markRead(n: NotifItem) {
    if (n.read) {
      if (n.link) router.push(n.link as any);
      return;
    }
    try {
      await api.post(`/me/notifications/${n.id}/read`, {}, token);
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      if (n.link) router.push(n.link as any);
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.post('/me/notifications/read-all', {}, token);
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    } catch {}
  }

  const unreadCount = items.filter((x) => !x.read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Bildirimler</Text>
          <Text style={styles.sub}>
            {unreadCount > 0 ? `${unreadCount} okunmamış` : 'Hepsi okundu'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead} hitSlop={8} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>Hepsini oku</Text>
          </Pressable>
        )}
      </View>

      {!loaded ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.muted} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        >
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>Bildirim yok</Text>
              <Text style={styles.emptySub}>Yeni bir hareket olduğunda burada göreceksin.</Text>
            </View>
          ) : (
            items.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => markRead(n)}
                style={({ pressed }) => [
                  styles.item,
                  !n.read && styles.itemUnread,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.icon}>{typeIcon(n.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, !n.read && styles.itemTitleUnread]}>
                    {n.title}
                  </Text>
                  {n.body && (
                    <Text style={styles.itemBody} numberOfLines={2}>{n.body}</Text>
                  )}
                  <Text style={styles.itemTime}>{timeAgo(n.createdAt)}</Text>
                </View>
                {!n.read && <View style={styles.unreadDot} />}
              </Pressable>
            ))
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  back: { width: 24 },
  backText: { fontSize: 28, color: colors.dark, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  readAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.bg,
    borderRadius: 8,
  },
  readAllText: { fontSize: 11, fontWeight: '700', color: colors.blue },
  body: { padding: 12, paddingBottom: 40, gap: 6 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.danger, fontSize: 12, padding: 12, textAlign: 'center' },
  empty: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.dark, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  item: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  itemUnread: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  icon: { fontSize: 22, marginTop: 2 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.dark },
  itemTitleUnread: { fontWeight: '800' },
  itemBody: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 },
  itemTime: { fontSize: 10, color: colors.muted, marginTop: 4, fontWeight: '600' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    marginTop: 6,
  },
});
