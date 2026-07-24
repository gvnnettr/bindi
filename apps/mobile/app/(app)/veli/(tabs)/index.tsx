import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { api, ApiError } from '../../../../src/api/client';
import { useAuth } from '../../../../src/state/auth';
import { colors } from '../../../../src/theme/colors';

interface ParentInfo {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface ParentOfferInList {
  id: string;
  monthlyPrice: string;
  status: 'pending' | 'selected' | 'rejected';
  provider: { id: string; companyName: string; phone: string | null };
  vehicle: { brand: string; model: string; plate: string } | null;
}

interface ParentRequestRaw {
  id: string;
  status: 'open' | 'closed' | 'cancelled';
  city: string;
  district: string;
  neighborhood: string | null;
  pickupType: string | null;
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
  pickupType: string | null;
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
    pickupType: r.pickupType,
    createdAt: r.createdAt,
    offerCount: r.offers.length,
    selectedOffer: sel,
    students: r.students,
  };
}

function TrackButton() {
  return (
    <Pressable
      onPress={() => router.push('/(app)/veli/servis-takip')}
      style={({ pressed }) => [styles.trackBtn, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.trackDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.trackLabel}>Servisi Canlı Takip Et</Text>
        <Text style={styles.trackSub}>Aktif servis varsa haritada göster</Text>
      </View>
      <Text style={styles.trackArrow}>›</Text>
    </Pressable>
  );
}

export default function VeliAnaScreen() {
  const { token } = useAuth();
  const [me, setMe] = useState<ParentInfo | null>(null);
  const [requests, setRequests] = useState<ParentRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [m, reqs] = await Promise.all([
        api.get<ParentInfo>('/me/parent', token),
        api.get<ParentRequestRaw[]>('/me/parent/requests', token),
      ]);
      setMe(m);
      setRequests(reqs.map(transformRequest));
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

  const active = useMemo(
    () => requests.filter((r) => r.status === 'open' && r.selectedOffer),
    [requests],
  );
  const openWithOffers = useMemo(
    () => requests.filter((r) => r.status === 'open' && !r.selectedOffer && r.offerCount > 0),
    [requests],
  );
  const openNoOffers = useMemo(
    () => requests.filter((r) => r.status === 'open' && !r.selectedOffer && r.offerCount === 0),
    [requests],
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFE28A', colors.primary, '#E1A800']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.3, y: 0.25 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView edges={['top']} style={styles.heroInner}>
          <View style={styles.heroTop}>
            <Image
              source={require('../../../../assets/bindi-logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <View style={styles.heroTopRight}>
              <Text style={styles.heroGreet}>Merhaba,</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {me?.name?.split(' ')[0] ?? '—'}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/(app)/veli/talep-ac')}
            style={({ pressed }) => [styles.ctaBox, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.ctaLeft}>
              <Text style={styles.ctaLabel}>Yeni Talep Aç</Text>
              <Text style={styles.ctaSub}>Bölgende servisçilerden anında teklif al</Text>
            </View>
            <View style={styles.ctaIcon}>
              <Text style={styles.ctaArrow}>+</Text>
            </View>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TrackButton />

        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktif Servis{active.length > 1 ? 'ler' : ''}</Text>
            {active.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/(app)/veli/talep/${r.id}`)}
                style={({ pressed }) => [styles.activeCard, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.activeHeader}>
                  <View>
                    <Text style={styles.activeCompany} numberOfLines={1}>
                      {r.selectedOffer!.provider.companyName}
                    </Text>
                    <Text style={styles.activeSub}>
                      {r.students[0]?.school ?? 'Okul'} · {r.students.length} öğrenci
                    </Text>
                  </View>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>✓ Aktif</Text>
                  </View>
                </View>
                {r.selectedOffer!.vehicle && (
                  <Text style={styles.activeVehicle}>
                    🚌 {r.selectedOffer!.vehicle.brand} {r.selectedOffer!.vehicle.model} · {r.selectedOffer!.vehicle.plate}
                  </Text>
                )}
                <View style={styles.activePrice}>
                  <Text style={styles.activePriceLabel}>Aylık ücret</Text>
                  <Text style={styles.activePriceValue}>
                    ₺{Number(r.selectedOffer!.monthlyPrice).toLocaleString('tr-TR')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {openWithOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Teklif Bekleyen ({openWithOffers.length})</Text>
            {openWithOffers.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/(app)/veli/talep/${r.id}`)}
                style={({ pressed }) => [styles.reqCard, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.reqIconBox}>
                  <Text style={styles.reqIcon}>{r.offerCount}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqTitle}>
                    {r.students[0]?.school ?? 'Okul'}
                  </Text>
                  <Text style={styles.reqSub}>{r.offerCount} teklif geldi · İnceleyip seç</Text>
                </View>
                <Text style={styles.reqChev}>›</Text>
              </Pressable>
            ))}
          </View>
        )}

        {openNoOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Teklif Beklenen ({openNoOffers.length})</Text>
            {openNoOffers.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/(app)/veli/talep/${r.id}`)}
                style={({ pressed }) => [styles.reqCard, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.reqIconBox, styles.reqIconBoxWait]}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M12 8v4l3 3M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqTitle}>
                    {r.students[0]?.school ?? 'Okul'}
                  </Text>
                  <Text style={styles.reqSub}>Servisçilere iletildi · Teklif bekleniyor</Text>
                </View>
                <Text style={styles.reqChev}>›</Text>
              </Pressable>
            ))}
          </View>
        )}

        {requests.length === 0 && !error && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Henüz talebin yok</Text>
            <Text style={styles.emptySub}>
              Yukarıdan "Yeni Talep Aç" ile başla. Bölgende çalışan tüm servisçilere anında ulaşırsın.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingBottom: 20 },
  heroInner: { paddingHorizontal: 20, paddingTop: 8 },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroLogo: { width: 140, height: 62 },
  heroTopRight: { alignItems: 'flex-end' },
  heroGreet: { fontSize: 15, color: 'rgba(31,41,55,0.7)', fontWeight: '600' },
  heroName: { fontSize: 15, fontWeight: '800', color: colors.dark, maxWidth: 160 },
  ctaBox: {
    backgroundColor: colors.dark,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: colors.dark,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaLeft: { flex: 1 },
  ctaLabel: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  ctaSub: { color: 'rgba(255,255,255,0.7)', fontSize: 15, marginTop: 3, fontWeight: '500' },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrow: { color: colors.dark, fontSize: 26, fontWeight: '800', marginTop: -2 },
  body: { padding: 20, paddingBottom: 40, gap: 20 },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.successSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  trackDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
  },
  trackLabel: { fontSize: 15, fontWeight: '800', color: '#065F46' },
  trackSub: { fontSize: 15, color: '#065F46', marginTop: 2, fontWeight: '600' },
  trackArrow: { fontSize: 22, color: '#065F46', fontWeight: '700' },
  errorBox: {
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
  },
  errorText: { color: '#991B1B', fontSize: 15, fontWeight: '600' },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  activeCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.success,
    gap: 10,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  activeCompany: { fontSize: 15, fontWeight: '800', color: colors.dark, maxWidth: 220 },
  activeSub: { fontSize: 15, color: colors.muted, marginTop: 2 },
  activeBadge: {
    backgroundColor: colors.successSoft,
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#065F46' },
  activeVehicle: { fontSize: 15, color: colors.dark, fontWeight: '600' },
  activePrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: 10,
    borderRadius: 10,
  },
  activePriceLabel: { fontSize: 15, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  activePriceValue: { fontSize: 18, fontWeight: '800', color: colors.dark },
  reqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reqIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqIconBoxWait: {
    backgroundColor: '#FEF3C7',
  },
  reqIcon: { fontSize: 18, fontWeight: '800', color: '#78350F' },
  reqTitle: { fontSize: 15, fontWeight: '700', color: colors.dark },
  reqSub: { fontSize: 15, color: colors.muted, marginTop: 2 },
  reqChev: { fontSize: 20, color: colors.muted, marginLeft: 4 },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 280 },
});
