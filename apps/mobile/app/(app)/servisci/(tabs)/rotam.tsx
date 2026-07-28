import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../../src/api/client';
import { useAuth } from '../../../../src/state/auth';
import { colors } from '../../../../src/theme/colors';

interface ActiveTrip {
  id: string;
  startedAt: string;
  routeName: string | null;
  currentLat: number | null;
  currentLng: number | null;
  vehicle: { id: string; brand: string; model: string; plate: string } | null;
  enrollments: Array<{
    id: string;
    orderNo: number | null;
    boardStatus: 'pending' | 'boarded' | 'missed';
    boardedAt: string | null;
    student: { id: string; name: string };
    parent: { id: string; name: string };
    address: string | null;
  }>;
}

function timeStr(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function RotamScreen() {
  const { token } = useAuth();
  const [trip, setTrip] = useState<ActiveTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<ActiveTrip | null>('/me/trips/active', token);
      setTrip(r);
      setError(null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      if (!/404/.test(msg)) setError(msg);
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function markBoard(enrollmentId: string, status: 'boarded' | 'missed' | 'pending') {
    if (!trip || !token) return;
    setBusyId(enrollmentId);
    try {
      await api.post(
        `/me/trips/${trip.id}/board`,
        { enrollmentId, status },
        token,
      );
      await load();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function openStudentActions(enrollmentId: string, name: string) {
    Alert.alert(name, undefined, [
      {
        text: 'Bindi',
        onPress: () => markBoard(enrollmentId, 'boarded'),
      },
      {
        text: 'Binmedi',
        onPress: () => markBoard(enrollmentId, 'missed'),
      },
      {
        text: 'Öğrenciyi Duraklat (Araçtan Çıkart)',
        style: 'destructive',
        onPress: () => pauseStudent(enrollmentId, name),
      },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  }

  async function pauseStudent(enrollmentId: string, name: string) {
    Alert.alert(
      `${name} duraklatılsın mı?`,
      'Öğrenci araçtan çıkarılır. Sonra yeniden aktifleştirip başka araca ekleyebilirsin.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Duraklat',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/me/enrollments/${enrollmentId}/pause`, {}, token);
              await load();
            } catch (e) {
              Alert.alert('Hata', e instanceof ApiError ? e.message : (e as Error).message);
            }
          },
        },
      ],
    );
  }

  async function endTrip() {
    if (!trip) return;
    Alert.alert(
      'Servisi bitir?',
      'Aktif servis sonlandırılır, veliler bilgilendirilir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Bitir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/me/trips/${trip.id}/end`, {}, token);
              await load();
            } catch (e) {
              Alert.alert('Hata', e instanceof ApiError ? e.message : (e as Error).message);
            }
          },
        },
      ],
    );
  }

  const boardedCount = trip?.enrollments.filter((e) => e.boardStatus === 'boarded').length ?? 0;
  const totalCount = trip?.enrollments.length ?? 0;

  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rotam</Text>
          <Text style={styles.sub}>{today}</Text>
        </View>
        {trip && (
          <>
            <View style={styles.liveBadge}>
              <View style={styles.livePulse} />
              <Text style={styles.liveText}>CANLI</Text>
            </View>
            <Pressable onPress={endTrip} style={styles.endBtn} hitSlop={8}>
              <Text style={styles.endBtnText}>Bitir</Text>
            </Pressable>
          </>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.dark} />
        </View>
      ) : !trip ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🚌</Text>
          <Text style={styles.emptyTitle}>Aktif servis yok</Text>
          <Text style={styles.emptySub}>
            Servisi başlat, öğrencileri seç — sonra bu ekrandan yoklama alırsın.
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/servisci/servis')}
            style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.startBtnText}>🚌 Servisi Başlat</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Başlangıç</Text>
              <Text style={styles.summaryValue}>{timeStr(trip.startedAt)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Öğrenci</Text>
              <Text style={styles.summaryValue}>{boardedCount}/{totalCount}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Konum</Text>
              <Text style={[styles.summaryValue, { color: trip.currentLat ? colors.success : colors.muted }]}>
                {trip.currentLat ? 'Yayında' : 'Kapalı'}
              </Text>
            </View>
          </View>

          {trip.vehicle && (
            <View style={styles.vehicleBadge}>
              <Text style={styles.vehicleText}>🚌 {trip.vehicle.brand} {trip.vehicle.model}</Text>
              <Text style={styles.plateText}>{trip.vehicle.plate}</Text>
            </View>
          )}

          <Text style={styles.listTitle}>Öğrenci Listesi</Text>

          {trip.enrollments.map((e, i) => {
            const isBoarded = e.boardStatus === 'boarded';
            const isMissed = e.boardStatus === 'missed';
            const isPending = e.boardStatus === 'pending';
            const isBusy = busyId === e.id;
            return (
              <Pressable
                key={e.id}
                onLongPress={() => openStudentActions(e.id, e.student.name)}
                style={[
                  styles.studentRow,
                  isBoarded && styles.studentRowBoarded,
                  isMissed && styles.studentRowMissed,
                ]}
              >
                <View style={[
                  styles.orderCircle,
                  isBoarded && { backgroundColor: colors.success, borderColor: colors.success },
                  isMissed && { backgroundColor: colors.danger, borderColor: colors.danger },
                ]}>
                  {isBoarded ? (
                    <Text style={styles.orderCheck}>✓</Text>
                  ) : isMissed ? (
                    <Text style={styles.orderCheck}>×</Text>
                  ) : (
                    <Text style={styles.orderNum}>{e.orderNo ?? i + 1}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{e.student.name}</Text>
                  {e.address && <Text style={styles.studentAddress} numberOfLines={1}>{e.address}</Text>}
                  {isBoarded && e.boardedAt && (
                    <Text style={styles.boardedTime}>Bindi · {timeStr(e.boardedAt)}</Text>
                  )}
                </View>
                {isBusy ? (
                  <ActivityIndicator size="small" color={colors.dark} />
                ) : isPending ? (
                  <View style={styles.actionCol}>
                    <Pressable
                      onPress={() => markBoard(e.id, 'boarded')}
                      style={[styles.actionBtn, styles.actionBoarded]}
                    >
                      <Text style={styles.actionBoardedText}>Bindi</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => markBoard(e.id, 'missed')}
                      style={[styles.actionBtn, styles.actionMissed]}
                    >
                      <Text style={styles.actionMissedText}>Binmedi</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => markBoard(e.id, 'pending')}
                    style={styles.undoBtn}
                    hitSlop={8}
                  >
                    <Text style={styles.undoText}>↺</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })}
          <Text style={styles.hint}>
            Öğrenciye uzun bas → Duraklat (araçtan çıkart)
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.dark, letterSpacing: -0.3 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: colors.success, borderRadius: 12,
  },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 },

  errorBox: { margin: 16, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },

  body: { padding: 16, gap: 12 },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 16, fontWeight: '800', color: colors.dark, marginTop: 4 },
  summaryDivider: { width: 1, height: 30, backgroundColor: colors.border },

  vehicleBadge: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 10, backgroundColor: colors.dark, borderRadius: 10,
  },
  vehicleText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  plateText: {
    color: colors.dark, fontSize: 12, fontWeight: '800',
    backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },

  listTitle: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8 },

  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  studentRowBoarded: { backgroundColor: '#F0FDF4', borderColor: colors.success },
  studentRowMissed: { backgroundColor: '#FEF2F2', borderColor: colors.danger },
  orderCircle: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card,
  },
  orderNum: { fontSize: 14, fontWeight: '800', color: colors.dark },
  orderCheck: { fontSize: 18, fontWeight: '800', color: '#fff' },
  studentName: { fontSize: 14, fontWeight: '700', color: colors.dark },
  studentAddress: { fontSize: 11, color: colors.muted, marginTop: 2 },
  boardedTime: { fontSize: 10, color: colors.success, fontWeight: '700', marginTop: 3 },

  actionCol: { gap: 4 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minWidth: 76, alignItems: 'center' },
  actionBoarded: { backgroundColor: colors.success },
  actionMissed: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.danger },
  actionBoardedText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  actionMissedText: { color: colors.danger, fontSize: 11, fontWeight: '800' },
  undoBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  undoText: { fontSize: 16, color: colors.dark },
  startBtn: {
    marginTop: 20, paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: colors.dark, borderRadius: 14,
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  endBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: colors.danger, borderRadius: 10,
  },
  endBtnText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  hint: {
    fontSize: 11, color: colors.muted, textAlign: 'center' as const,
    marginTop: 12, fontStyle: 'italic' as const,
  },
});
