import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Linking, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { colors } from '../../../src/theme/colors';

interface ActiveTrip {
  id: string;
  startedAt: string;
  routeName: string | null;
  currentLat: number | null;
  currentLng: number | null;
  locationUpdatedAt: string | null;
  provider: { id: string; companyName: string; phone: string };
  vehicle: { brand: string; model: string; plate: string } | null;
  students: Array<{ id: string; name: string }>;
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
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
}

export default function ServisTakipScreen() {
  const { token } = useAuth();
  const [trips, setTrips] = useState<ActiveTrip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<ActiveTrip[]>('/me/parent/trips/active', token);
      setTrips(r);
      setError(null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      if (!/404/.test(msg)) setError(msg);
      setTrips([]);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Auto refresh every 10 seconds
  useEffect(() => {
    if (trips.length === 0) return;
    const i = setInterval(() => { void load(); }, 10_000);
    return () => clearInterval(i);
  }, [trips.length, load]);

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
        <Text style={styles.headerTitle}>Servisi Takip Et</Text>
        <View style={{ width: 32 }} />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
      >
        {trips.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.iconBox}>
              <Text style={styles.iconEmoji}>🚌</Text>
            </View>
            <Text style={styles.emptyTitle}>Aktif servis yok</Text>
            <Text style={styles.emptySub}>Servisçin servisi başlattığında burada canlı konum ve tahmini varış görünecek.</Text>
          </View>
        ) : (
          trips.map((trip) => <TripCard key={trip.id} trip={trip} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TripCard({ trip }: { trip: ActiveTrip }) {
  const hasLocation = trip.currentLat != null && trip.currentLng != null;
  const region = useMemo(() => {
    if (!hasLocation) return null;
    return {
      latitude: trip.currentLat!,
      longitude: trip.currentLng!,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [trip.currentLat, trip.currentLng, hasLocation]);

  return (
    <View style={styles.tripCard}>
      <View style={styles.pulseRow}>
        <View style={styles.pulseDot} />
        <Text style={styles.activeLabel}>Servis Aktif</Text>
        <Text style={styles.durationText}>{durationString(trip.startedAt)}</Text>
      </View>

      <Text style={styles.company}>{trip.provider.companyName}</Text>
      {trip.vehicle && (
        <View style={styles.vehicleRow}>
          <Text style={styles.vehicleText}>🚌 {trip.vehicle.brand} {trip.vehicle.model}</Text>
          <Text style={styles.plateText}>{trip.vehicle.plate}</Text>
        </View>
      )}

      {hasLocation && region ? (
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            initialRegion={region}
            region={region}
            showsUserLocation={false}
            scrollEnabled
            zoomEnabled
          >
            <Marker
              coordinate={{ latitude: trip.currentLat!, longitude: trip.currentLng! }}
              title={trip.vehicle?.plate ?? trip.provider.companyName}
              description={trip.students.map((s) => s.name).join(', ')}
              pinColor={colors.primary}
            />
          </MapView>
          <View style={styles.mapOverlay}>
            <Text style={styles.mapTime}>Güncelleme: {timeSince(trip.locationUpdatedAt)}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noLocBox}>
          <Text style={styles.noLocText}>Konum henüz alınmadı</Text>
          <Text style={styles.noLocSub}>Servisçi yola çıktığında canlı konumu burada göreceksin</Text>
        </View>
      )}

      <View style={styles.studentsRow}>
        <Text style={styles.studentsLabel}>Serviste:</Text>
        <Text style={styles.studentsText}>{trip.students.map((s) => s.name).join(', ')}</Text>
      </View>

      <View style={styles.contactRow}>
        <Pressable
          onPress={() => Linking.openURL(`tel:${trip.provider.phone}`)}
          style={styles.contactBtn}
        >
          <Text style={styles.contactBtnEmoji}>📞</Text>
          <Text style={styles.contactBtnText}>Servisçiyi Ara</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(`whatsapp://send?phone=${trip.provider.phone.replace(/\D/g, '')}`)}
          style={[styles.contactBtn, styles.contactBtnWa]}
        >
          <Text style={styles.contactBtnWaText}>WhatsApp</Text>
        </Pressable>
      </View>
    </View>
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
  errorBox: { marginHorizontal: 20, marginTop: 8, padding: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 10 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },
  body: { padding: 20, gap: 14, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  iconBox: {
    width: 100, height: 100, borderRadius: 25, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20, maxWidth: 320 },

  tripCard: {
    padding: 16, backgroundColor: colors.card, borderRadius: 18,
    borderWidth: 2, borderColor: colors.success, gap: 10,
  },
  pulseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  activeLabel: { fontSize: 12, fontWeight: '800', color: colors.success, textTransform: 'uppercase', letterSpacing: 1 },
  durationText: { fontSize: 11, color: colors.muted, fontWeight: '600', marginLeft: 'auto' },
  company: { fontSize: 18, fontWeight: '800', color: colors.dark, letterSpacing: -0.3 },
  vehicleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 10, backgroundColor: colors.bg, borderRadius: 10,
  },
  vehicleText: { fontSize: 13, color: colors.dark, fontWeight: '700' },
  plateText: {
    fontSize: 12, fontWeight: '800', color: colors.dark,
    backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  mapWrap: {
    height: 220, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  map: { flex: 1 },
  mapOverlay: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  mapTime: { fontSize: 10, color: colors.dark, fontWeight: '700' },
  noLocBox: {
    padding: 20, backgroundColor: colors.bg,
    borderRadius: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  noLocText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  noLocSub: { fontSize: 11, color: colors.muted, textAlign: 'center' },
  studentsRow: { flexDirection: 'row', gap: 6 },
  studentsLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  studentsText: { fontSize: 12, color: colors.dark, flex: 1, fontWeight: '600' },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong,
  },
  contactBtnEmoji: { fontSize: 14 },
  contactBtnText: { fontSize: 13, fontWeight: '700', color: colors.dark },
  contactBtnWa: { backgroundColor: '#25D366', borderColor: '#25D366' },
  contactBtnWaText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
