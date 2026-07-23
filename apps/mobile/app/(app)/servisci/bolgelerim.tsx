import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { ErrorBanner, Input } from '../../../src/components/ui';
import { colors } from '../../../src/theme/colors';

interface RegionItem {
  id: string;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  label: string | null;
}

const DEFAULT_REGION = {
  latitude: 40.9861,
  longitude: 37.8788,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function KonumScreen() {
  const { token } = useAuth();
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<RegionItem[]>('/me/regions', token);
      setRegions(r);
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

  async function removeRegion(id: string, label: string) {
    try {
      await api.del(`/me/regions/${id}`, token);
      setRegions((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(`${label} silinemedi: ${(e as Error).message}`);
    }
  }

  // Sadece location-based bölgeler
  const locationRegions = regions.filter((r) => r.latitude != null && r.longitude != null && r.radiusKm != null);
  const legacyRegions = regions.filter((r) => r.latitude == null || r.longitude == null || r.radiusKm == null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Konum</Text>
          <Text style={styles.sub}>Hizmet çemberin — bu alandaki talepler bildirim olarak gelir</Text>
        </View>
        <Pressable
          onPress={() => setModalOpen(true)}
          style={styles.addBtn}
          hitSlop={8}
        >
          <Text style={styles.addBtnText}>+ Ekle</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
      >
        <ErrorBanner message={error} />

        {locationRegions.length === 0 && legacyRegions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>Henüz konum eklemedin</Text>
            <Text style={styles.emptySub}>
              Hizmet çemberini haritada belirle. İçindeki tüm veli talepleri sana bildirilir.
            </Text>
            <Pressable onPress={() => setModalOpen(true)} style={styles.emptyCta}>
              <Text style={styles.emptyCtaText}>İlk Konumumu Ekle</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {locationRegions.map((r) => (
              <View key={r.id} style={styles.regionCard}>
                <View style={styles.regionMap}>
                  <MapView
                    provider={PROVIDER_DEFAULT}
                    style={StyleSheet.absoluteFillObject}
                    initialRegion={{
                      latitude: r.latitude!,
                      longitude: r.longitude!,
                      latitudeDelta: (r.radiusKm! * 2) / 111,
                      longitudeDelta: (r.radiusKm! * 2) / 111,
                    }}
                    pointerEvents="none"
                    showsCompass={false}
                  >
                    <Marker coordinate={{ latitude: r.latitude!, longitude: r.longitude! }} pinColor={colors.primary} />
                    <Circle
                      center={{ latitude: r.latitude!, longitude: r.longitude! }}
                      radius={r.radiusKm! * 1000}
                      fillColor="rgba(255,199,44,0.15)"
                      strokeColor={colors.primaryDark}
                      strokeWidth={2}
                    />
                  </MapView>
                </View>
                <View style={styles.regionBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.regionTitle}>{r.label ?? 'İşaretsiz konum'}</Text>
                    <Text style={styles.regionSub}>{r.radiusKm} km yarıçap</Text>
                  </View>
                  <Pressable
                    onPress={() => removeRegion(r.id, r.label ?? 'Konum')}
                    hitSlop={8}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {legacyRegions.length > 0 && (
              <>
                <Text style={styles.sectionHint}>ESKİ İL/İLÇE BÖLGELERİ</Text>
                {legacyRegions.map((r) => (
                  <View key={r.id} style={styles.legacyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.legacyTitle}>{r.district}</Text>
                      <Text style={styles.legacySub}>{r.city}</Text>
                    </View>
                    <Pressable
                      onPress={() => removeRegion(r.id, `${r.district}, ${r.city}`)}
                      hitSlop={8}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
                <Text style={styles.migrateHint}>
                  💡 İpucu: Yeni konum-yarıçap sistemi daha esnek. Eski bölgeleri silip konum ekleyebilirsin.
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>

      <AddLocationModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onDone={async () => {
          setModalOpen(false);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function AddLocationModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const [label, setLabel] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [center, setCenter] = useState<{ latitude: number; longitude: number }>({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  async function useMyLocation() {
    setError(null);
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setError('Konum izni verilmedi.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCenter(p);
      setMapRegion({
        ...p,
        latitudeDelta: (radiusKm * 2) / 111,
        longitudeDelta: (radiusKm * 2) / 111,
      });
    } catch (e) {
      setError('Konum alınamadı: ' + (e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  async function submit() {
    if (!label.trim()) { setError('Konuma bir isim ver (ör: "İş yeri", "Ev")'); return; }
    setLoading(true);
    setError(null);
    try {
      await api.post('/me/regions/location', {
        label: label.trim(),
        latitude: center.latitude,
        longitude: center.longitude,
        radiusKm,
      }, token);
      setLabel('');
      setRadiusKm(10);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const circleRadius = useMemo(() => radiusKm * 1000, [radiusKm]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mstyles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <View style={mstyles.sheet}>
            <View style={mstyles.grabber} />
            <View style={mstyles.headerRow}>
              <Text style={mstyles.title}>Konum Ekle</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={mstyles.close}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 500 }}>
              <ErrorBanner message={error} />

              <View style={mstyles.mapWrap}>
                <MapView
                  provider={PROVIDER_DEFAULT}
                  style={StyleSheet.absoluteFillObject}
                  region={mapRegion}
                  onRegionChangeComplete={(reg) => {
                    setCenter({ latitude: reg.latitude, longitude: reg.longitude });
                    setMapRegion(reg);
                  }}
                  showsUserLocation
                >
                  <Circle
                    center={center}
                    radius={circleRadius}
                    fillColor="rgba(255,199,44,0.15)"
                    strokeColor={colors.primaryDark}
                    strokeWidth={2}
                  />
                </MapView>
                <View style={mstyles.centerPin}>
                  <Text style={mstyles.centerPinText}>📍</Text>
                </View>
              </View>

              <Text style={mstyles.mapHint}>Haritayı kaydırarak merkezi ayarla</Text>

              <Pressable onPress={useMyLocation} style={mstyles.locBtn} disabled={locating}>
                <Text style={mstyles.locBtnText}>
                  {locating ? 'Konum alınıyor...' : '📍 Konumumu Kullan'}
                </Text>
              </Pressable>

              <View style={mstyles.radiusRow}>
                <Text style={mstyles.radiusLabel}>YARIÇAP</Text>
                <Text style={mstyles.radiusValue}>{radiusKm} km</Text>
              </View>
              <View style={mstyles.chipRow}>
                {[5, 10, 15, 20, 30].map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setRadiusKm(r);
                      setMapRegion({
                        ...center,
                        latitudeDelta: (r * 2) / 111,
                        longitudeDelta: (r * 2) / 111,
                      });
                    }}
                    style={[mstyles.chip, radiusKm === r && mstyles.chipActive]}
                  >
                    <Text style={[mstyles.chipText, radiusKm === r && mstyles.chipTextActive]}>
                      {r} km
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Input
                label="Konum Adı"
                value={label}
                onChangeText={setLabel}
                placeholder='Örn: "Ana bölgem", "Kadıköy şubesi"'
              />
            </ScrollView>

            <Pressable
              onPress={submit}
              disabled={loading}
              style={({ pressed }) => [
                mstyles.primaryBtn,
                (loading || pressed) && { opacity: 0.85 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={mstyles.primaryBtnText}>Konumu Ekle</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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
  back: { fontSize: 28, color: colors.dark, fontWeight: '700', width: 20 },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.dark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  body: { padding: 16, paddingBottom: 40 },
  empty: { padding: 32, alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.dark, marginBottom: 6 },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCtaText: { color: colors.dark, fontWeight: '800', fontSize: 14 },
  regionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  regionMap: {
    height: 140,
    position: 'relative',
  },
  regionBody: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  regionTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  regionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { fontSize: 14, color: colors.danger, fontWeight: '800' },
  sectionHint: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  legacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legacyTitle: { fontSize: 14, fontWeight: '700', color: colors.dark },
  legacySub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  migrateHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

const mstyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '92%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  close: { fontSize: 20, color: colors.muted },

  mapWrap: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EBF3EB',
    marginBottom: 8,
    position: 'relative',
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -22,
    marginLeft: -11,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPinText: { fontSize: 24 },
  mapHint: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 12,
  },
  locBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  locBtnText: { fontSize: 13, color: '#1E40AF', fontWeight: '700' },

  radiusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  radiusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.5,
  },
  radiusValue: { fontSize: 16, fontWeight: '800', color: colors.dark },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  chipTextActive: { color: colors.dark, fontWeight: '800' },

  primaryBtn: {
    backgroundColor: colors.dark,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
