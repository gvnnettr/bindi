import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { Button, ErrorBanner, Input } from '../../../src/components/ui';
import { colors } from '../../../src/theme/colors';

interface ActiveTrip {
  id: string;
  startedAt: string;
  routeName: string | null;
  currentLat: number | null;
  currentLng: number | null;
  locationUpdatedAt: string | null;
  vehicle: { id: string; brand: string; model: string; plate: string } | null;
  enrollments: Array<{ id: string; student: { id: string; name: string }; parent: { id: string; name: string } }>;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plate: string;
  seats: number;
}

interface Enrollment {
  id: string;
  monthlyPrice: number;
  student: { id: string; name: string; class: string | null; school: { id: string; name: string } | null };
  parent: { id: string; name: string; phone: string };
  vehicle: { id: string; brand: string; model: string; plate: string } | null;
  vehicleId?: string | null;
  // Backend eklendiğinde veli tarafından "bugün gelmeyecek" işareti gelir
  absentToday?: boolean;
}

function timeSince(iso: string | null): string {
  if (!iso) return 'henüz konum yok';
  const then = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - then) / 1000);
  if (sec < 60) return `${sec} sn önce`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  return `${hr} sa önce`;
}

function durationString(startIso: string): string {
  const dur = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(dur / 3600);
  const m = Math.floor((dur % 3600) / 60);
  return h > 0 ? `${h} saat ${m} dk` : `${m} dk`;
}

export default function ServisScreen() {
  const { token } = useAuth();
  const [active, setActive] = useState<ActiveTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startModal, setStartModal] = useState(false);
  const [tick, setTick] = useState(0); // re-render for duration
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<ActiveTrip | null>('/me/trips/active', token);
      setActive(r);
      setError(null);
    } catch (e) {
      // Backend'e trip modülü canlıya alınmadıysa 404 gelir — sessiz
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      if (!/404/.test(msg)) setError(msg);
      setActive(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Duration ticker (her 20 saniyede yeniden çiz)
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setTick((t) => t + 1), 20_000);
    return () => clearInterval(i);
  }, [active]);

  // Konum takibi — aktif trip varsa her 10 saniyede POST
  useEffect(() => {
    if (!active || !token) {
      if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
      return;
    }
    let cancelled = false;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted || cancelled) return;
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10_000,
          distanceInterval: 20,
        },
        async (pos) => {
          try {
            await api.post(
              `/me/trips/${active.id}/location`,
              { lat: pos.coords.latitude, lng: pos.coords.longitude },
              token,
            );
            await load();
          } catch {}
        },
      );
      watchRef.current = sub;
    })();
    return () => {
      cancelled = true;
      if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    };
  }, [active?.id, token, load]);

  async function endTrip() {
    if (!active) return;
    Alert.alert(
      'Servisi bitir',
      `Bu servis (${active.enrollments.length} öğrenci) sonlandırılacak. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Servisi Bitir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/me/trips/${active.id}/end`, {}, token);
              if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
              await load();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : (e as Error).message);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}><ActivityIndicator color={colors.muted} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 32 }}>
          <Text style={{ fontSize: 28, color: colors.dark, fontWeight: '600' }}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Servis</Text>
        <View style={{ width: 32 }} />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {active ? (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.activeCard}>
            <View style={styles.pulseRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.activeLabel}>Servis Aktif</Text>
              <Text style={styles.durationText}>{durationString(active.startedAt)}</Text>
            </View>

            {active.routeName && <Text style={styles.routeName}>{active.routeName}</Text>}

            {active.vehicle && (
              <View style={styles.vehicleBox}>
                <Text style={styles.vehicleText}>🚌 {active.vehicle.brand} {active.vehicle.model}</Text>
                <Text style={styles.plateText}>{active.vehicle.plate}</Text>
              </View>
            )}

            <View style={styles.locBox}>
              <Text style={styles.locLabel}>Son konum güncellemesi</Text>
              <Text style={styles.locValue}>
                {active.currentLat != null && active.currentLng != null
                  ? `${active.currentLat.toFixed(4)}, ${active.currentLng.toFixed(4)}`
                  : '—'}
              </Text>
              <Text style={styles.locTime}>{timeSince(active.locationUpdatedAt)}</Text>
            </View>

            <Text style={styles.sectionTitle}>Bu Serviste ({active.enrollments.length})</Text>
            {active.enrollments.map((e) => (
              <View key={e.id} style={styles.studentRow}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarText}>{e.student.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{e.student.name}</Text>
                  <Text style={styles.studentParent}>Veli: {e.parent.name}</Text>
                </View>
              </View>
            ))}

            <Pressable onPress={endTrip} style={styles.endBtn}>
              <Text style={styles.endBtnText}>Servisi Bitir</Text>
            </Pressable>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Konum takibi çalışıyor</Text>
            <Text style={styles.infoText}>
              Uygulama açık olduğu sürece konumun her 10 saniyede velilere gönderilir. Ekranı kapatınca güncellenme durur.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyBody}>
          <View style={styles.iconBox}>
            <Text style={styles.iconEmoji}>🚌</Text>
          </View>
          <Text style={styles.emptyTitle}>Aktif servis yok</Text>
          <Text style={styles.emptySub}>Yeni bir servis başlat, öğrenciyi seç, konumu velilere gösterilsin.</Text>
          <Pressable
            onPress={() => setStartModal(true)}
            style={styles.startCta}
          >
            <Text style={styles.startCtaText}>+ Servis Başlat</Text>
          </Pressable>
        </View>
      )}

      <StartTripModal
        visible={startModal}
        onClose={() => setStartModal(false)}
        onDone={async () => {
          setStartModal(false);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function StartTripModal({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const { token } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const [routeName, setRouteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !token) return;
    setLoadingData(true);
    setError(null);
    Promise.all([
      api.get<Enrollment[]>('/me/enrollments', token).catch(() => [] as Enrollment[]),
      api.get<Vehicle[]>('/me/vehicles', token).catch(() => [] as Vehicle[]),
    ])
      .then(([es, vs]) => {
        const active = es.filter((e: any) => e.status !== 'ended');
        setEnrollments(active);
        setVehicles(vs);
        // Tek araç varsa otomatik seç
        if (vs.length === 1) setVehicleId(vs[0].id);
        // Veli tarafından "bugün gelmeyecek" işaretlenenleri absentIds'e al
        setAbsentIds(new Set(active.filter((e) => e.absentToday).map((e) => e.id)));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoadingData(false));
  }, [visible, token]);

  // Seçili araca ait öğrenciler
  const vehicleEnrollments = vehicleId
    ? enrollments.filter((e) => (e.vehicleId ?? e.vehicle?.id) === vehicleId)
    : [];

  // Servisi başlatan enrollmentlar = seçili araç öğrencileri - gelmeyenler
  const activeEnrollments = vehicleEnrollments.filter((e) => !absentIds.has(e.id));

  async function toggleAbsent(enrollmentId: string) {
    const wasAbsent = absentIds.has(enrollmentId);
    // Optimistic UI — hemen değiştir, hata olursa geri al
    setAbsentIds((prev) => {
      const next = new Set(prev);
      if (wasAbsent) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
    try {
      if (wasAbsent) {
        await api.del(`/me/enrollments/${enrollmentId}/absent-today`, token);
      } else {
        await api.post(`/me/enrollments/${enrollmentId}/absent-today`, {}, token);
      }
    } catch (e) {
      // Rollback
      setAbsentIds((prev) => {
        const next = new Set(prev);
        if (wasAbsent) next.add(enrollmentId);
        else next.delete(enrollmentId);
        return next;
      });
      Alert.alert('İşaretleme yapılamadı', e instanceof ApiError ? e.message : (e as Error).message);
    }
  }

  async function submit() {
    if (!vehicleId) {
      setError('Servisi hangi araçla başlatacağını seç');
      return;
    }
    if (activeEnrollments.length === 0) {
      setError('En az bir öğrenci aktif olmalı — hepsi "gelmeyecek" işaretli');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(
        '/me/trips/start',
        {
          enrollmentIds: activeEnrollments.map((e) => e.id),
          vehicleId,
          routeName: routeName.trim() || undefined,
        },
        token,
      );
      setVehicleId(vehicles.length === 1 ? vehicles[0].id : null);
      setAbsentIds(new Set());
      setRouteName('');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={ms.sheet}>
            <View style={ms.grabber} />
            <View style={ms.headerRow}>
              <Text style={ms.title}>Servis Başlat</Text>
              <Pressable onPress={onClose} hitSlop={12}><Text style={ms.close}>✕</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={ms.body} keyboardShouldPersistTaps="handled">
              <ErrorBanner message={error} />

              {loadingData ? (
                <ActivityIndicator color={colors.muted} style={{ marginTop: 40 }} />
              ) : (
                <>
                  {/* 1. ARAÇ (zorunlu, önce seçilir) */}
                  {vehicles.length === 0 ? (
                    <View style={ms.warnBox}>
                      <Text style={ms.warnTitle}>⚠️ Aracın yok</Text>
                      <Text style={ms.warnHint}>
                        Servis başlatabilmek için önce Araçlarım'dan bir araç eklemelisin.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={ms.sectionLabel}>1. Araç · Zorunlu</Text>
                      <View style={ms.chipRow}>
                        {vehicles.map((v) => (
                          <Pressable
                            key={v.id}
                            onPress={() => setVehicleId(v.id)}
                            style={[ms.chip, vehicleId === v.id && ms.chipActive]}
                          >
                            <Text style={[ms.chipText, vehicleId === v.id && ms.chipTextActive]}>
                              {v.plate}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}

                  {/* 2. ÖĞRENCİLER (seçili araca göre otomatik listelenir) */}
                  {vehicleId && (
                    <>
                      <Text style={ms.sectionLabel}>
                        2. Bu Servisteki Öğrenciler · {activeEnrollments.length}
                        {absentIds.size > 0 ? ` (+${absentIds.size} gelmeyecek)` : ''}
                      </Text>
                      {vehicleEnrollments.length === 0 ? (
                        <View style={ms.warnBox}>
                          <Text style={ms.warnTitle}>Bu araca kayıtlı öğrenci yok</Text>
                          <Text style={ms.warnHint}>
                            Kazandığın işleri Öğrencilerim'den bu araca ata, sonra buradan servis başlat.
                          </Text>
                        </View>
                      ) : (
                        <View style={ms.list}>
                          {vehicleEnrollments.map((e) => {
                            const isAbsent = absentIds.has(e.id);
                            return (
                              <View
                                key={e.id}
                                style={[ms.enrCard, isAbsent && ms.enrCardAbsent]}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={[ms.enrName, isAbsent && ms.enrNameAbsent]}>
                                    {e.student.name}
                                  </Text>
                                  <Text style={[ms.enrMeta, isAbsent && ms.enrMetaAbsent]}>
                                    {e.student.class ?? '—'}
                                    {e.student.school ? ` · ${e.student.school.name}` : ''}
                                    {isAbsent && e.absentToday && ' · Veli işaretledi'}
                                    {isAbsent && !e.absentToday && ' · Sen işaretledin'}
                                  </Text>
                                </View>
                                <Pressable
                                  onPress={() => toggleAbsent(e.id)}
                                  style={[ms.absentBtn, isAbsent && ms.absentBtnActive]}
                                >
                                  <Text style={[ms.absentBtnText, isAbsent && ms.absentBtnTextActive]}>
                                    {isAbsent ? '↺ Geri al' : 'Bugün gelmeyecek'}
                                  </Text>
                                </Pressable>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      <Text style={ms.absentHint}>
                        💡 Gelmeyecek öğrencilerin velilerine "servis başladı" bildirimi gitmez, listede pasif görünürler.
                      </Text>
                    </>
                  )}

                  {vehicleId && vehicleEnrollments.length > 0 && (
                    <>
                      <Input
                        label="Sefer Adı (opsiyonel)"
                        value={routeName}
                        onChangeText={setRouteName}
                        placeholder="Sabah - Merkez"
                        hint="Kolay hatırlaman için"
                      />

                      <Button
                        label={loading ? 'Başlatılıyor...' : `Servisi Başlat · ${activeEnrollments.length} öğrenci`}
                        onPress={submit}
                        loading={loading}
                        disabled={activeEnrollments.length === 0}
                        style={{ marginTop: 12 }}
                      />
                      <Text style={ms.hint}>Servis başlar başlamaz aktif velilere bildirim gider, konumun paylaşılır.</Text>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  grabber: { width: 40, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  close: { fontSize: 20, color: colors.muted, fontWeight: '700' },
  body: { padding: 20, gap: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 6 },
  list: { gap: 6, marginBottom: 8 },
  enrCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, backgroundColor: colors.card, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  enrCardActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  enrCardAbsent: {
    backgroundColor: colors.bg,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    opacity: 0.85,
  },
  check: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  checkActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  checkMark: { color: '#fff', fontWeight: '800', fontSize: 12 },
  enrName: { fontSize: 13, fontWeight: '700', color: colors.dark },
  enrNameAbsent: {
    color: colors.muted,
    textDecorationLine: 'line-through',
    textDecorationColor: colors.muted,
  },
  enrMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  enrMetaAbsent: { color: colors.muted, fontStyle: 'italic' },
  absentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: '#fff',
  },
  absentBtnActive: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  absentBtnText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  absentBtnTextActive: { color: '#fff', fontWeight: '800' },
  absentHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  warnBox: {
    padding: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 12,
  },
  warnTitle: { fontSize: 13, fontWeight: '800', color: '#78350F' },
  warnHint: { fontSize: 11, color: '#78350F', marginTop: 4, lineHeight: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.dark, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }) },
  chipTextActive: { color: colors.dark },
  hint: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 16 },
});

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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { marginHorizontal: 20, marginTop: 8, padding: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 10 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },
  body: { padding: 20, gap: 14 },
  activeCard: {
    padding: 18, backgroundColor: colors.card, borderRadius: 20,
    borderWidth: 2, borderColor: colors.success, gap: 12,
  },
  pulseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  activeLabel: { fontSize: 12, fontWeight: '800', color: colors.success, textTransform: 'uppercase', letterSpacing: 1 },
  durationText: { fontSize: 11, color: colors.muted, fontWeight: '600', marginLeft: 'auto' },
  routeName: { fontSize: 20, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  vehicleBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, backgroundColor: colors.bg, borderRadius: 12,
  },
  vehicleText: { fontSize: 13, color: colors.dark, fontWeight: '700' },
  plateText: {
    fontSize: 12, fontWeight: '800', color: colors.dark,
    backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  locBox: {
    padding: 14, backgroundColor: colors.successSoft, borderRadius: 12,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  locLabel: { fontSize: 10, fontWeight: '800', color: '#065F46', textTransform: 'uppercase', letterSpacing: 0.5 },
  locValue: { fontSize: 14, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }), color: '#065F46', marginTop: 4, fontWeight: '700' },
  locTime: { fontSize: 10, color: '#065F46', marginTop: 3, fontWeight: '600', opacity: 0.75 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4,
  },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, backgroundColor: colors.bg, borderRadius: 10,
  },
  studentAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 14, fontWeight: '800', color: colors.dark },
  studentName: { fontSize: 13, fontWeight: '700', color: colors.dark },
  studentParent: { fontSize: 10, color: colors.muted, marginTop: 2 },
  endBtn: {
    marginTop: 8, padding: 14, borderRadius: 12,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    alignItems: 'center',
  },
  endBtnText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  infoBox: {
    padding: 14, backgroundColor: colors.primarySoft, borderRadius: 12,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  infoTitle: { fontSize: 12, fontWeight: '800', color: '#78350F' },
  infoText: { fontSize: 11, color: '#78350F', marginTop: 4, lineHeight: 17 },
  emptyBody: { flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center', gap: 12 },
  iconBox: {
    width: 100, height: 100, borderRadius: 25, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.dark, letterSpacing: -0.5, marginTop: 8 },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  startCta: {
    marginTop: 16, paddingHorizontal: 28, paddingVertical: 15,
    borderRadius: 14, backgroundColor: colors.dark,
  },
  startCtaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
