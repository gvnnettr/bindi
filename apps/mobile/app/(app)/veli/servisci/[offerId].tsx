import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { api, ApiError } from '../../../../src/api/client';
import { useAuth } from '../../../../src/state/auth';
import { colors } from '../../../../src/theme/colors';

interface OfferItem {
  id: string;
  monthlyPrice: string;
  note: string | null;
  status: 'pending' | 'selected' | 'rejected';
  provider: {
    id: string;
    companyName: string;
    ownerName: string;
    phone: string | null;
    rating: { avg: number; count: number } | null;
  };
  vehicle: { brand: string; model: string; year: number; plate: string; seats: number } | null;
}

interface ParentRequest {
  id: string;
  status: string;
  city: string;
  district: string;
  magicToken: string;
  distanceKm: number | null;
  etaMin: number | null;
  hasLocation: boolean;
  offers: OfferItem[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function starsStr(avg: number | null): string {
  if (avg == null) return '☆☆☆☆☆';
  const n = Math.round(avg);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

interface PublicReview {
  rating: number;
  comment: string | null;
  createdAt: string;
  parentInitials: string;
}
interface PublicReviewsResp {
  avg: number;
  total: number;
  reviews: PublicReview[];
}

export default function ServisciDetayScreen() {
  const { offerId, requestId } = useLocalSearchParams<{ offerId: string; requestId: string }>();
  const { token } = useAuth();
  const [request, setRequest] = useState<ParentRequest | null>(null);
  const [offer, setOffer] = useState<OfferItem | null>(null);
  const [reviews, setReviews] = useState<PublicReviewsResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  const load = useCallback(async () => {
    if (!token || !requestId || !offerId) return;
    try {
      const all = await api.get<ParentRequest[]>('/me/parent/requests', token);
      const r = all.find((x) => x.id === requestId) ?? null;
      const o = r?.offers.find((x) => x.id === offerId) ?? null;
      setRequest(r);
      setOffer(o);
      setError(null);

      // Public reviews (opsiyonel, hata olursa sessiz)
      if (o?.provider?.id) {
        try {
          const rev = await api.get<PublicReviewsResp>(`/providers/${o.provider.id}/reviews`);
          setReviews(rev);
        } catch {}
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [token, requestId, offerId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function selectOffer() {
    if (!request || !offer) return;
    Alert.alert(
      'Bu servisçiyi seç',
      `${offer.provider.companyName} seçtikten sonra diğer teklifler kapanır. İletişim bilgileri sana açılır. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Servisçiyi Seç',
          style: 'default',
          onPress: async () => {
            setSelecting(true);
            try {
              await api.post(
                `/requests/${request.magicToken}/offers/select`,
                { offerId: offer.id },
              );
              router.back();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : (e as Error).message);
              setSelecting(false);
            }
          },
        },
      ],
    );
  }

  const contract = useMemo(() => {
    const now = new Date();
    const startMonth = now.getMonth() < 8 ? 8 : now.getMonth(); // Eylül (index 8)
    // 9 ay: Eyl → Haz
    return { label: '9 ay · Eyl→Haz' };
  }, []);

  if (!offer || !request) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Servisçi</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.loading}>
          {error ? <Text style={styles.errorText}>{error}</Text> : <ActivityIndicator color={colors.muted} />}
        </View>
      </SafeAreaView>
    );
  }

  const p = offer.provider;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{p.companyName}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* HERO */}
        <LinearGradient
          colors={['#FFF6D9', '#FFECB0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTag}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#78350F" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />
              <Path d="M9 12l2 2 4-4" />
            </Svg>
            <Text style={styles.heroTagText}>Servisçi · Doğrulanmış</Text>
          </View>

          <View style={styles.heroRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(p.companyName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle} numberOfLines={1}>{p.companyName}</Text>
              <Text style={styles.heroSubtitle}>{request.district}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStars}>{starsStr(p.rating?.avg ?? null)}</Text>
                <Text style={styles.ratingNum}>
                  {p.rating?.avg ? p.rating.avg.toFixed(1) : '—'}
                </Text>
                {p.rating && p.rating.count > 0 && (
                  <Text style={styles.ratingMeta}>· {p.rating.count} yorum</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.statGrid}>
            <StatBox label="Tamamladı" value={String(p.rating?.count ?? 0)} unit="iş" />
            <StatBox label="Zamanında" value="—" unit="" />
            <StatBox label="Ort. Cvp" value="—" unit="dk" />
          </View>
        </LinearGradient>

        {request.distanceKm != null && request.etaMin != null && (
          <View style={styles.distanceCard}>
            <View style={styles.distanceIcon}>
              <Text style={{ fontSize: 18 }}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.distanceLabel}>Adresinden okula mesafe</Text>
              <Text style={styles.distanceValue}>
                {request.distanceKm} km <Text style={styles.distanceMuted}>·</Text> ~{request.etaMin} dk
              </Text>
            </View>
          </View>
        )}

        {/* ARAÇ */}
        {offer.vehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Araç</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Model</Text>
              <Text style={styles.detailValue}>
                {offer.vehicle.brand} {offer.vehicle.model} · {offer.vehicle.seats}+1
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plaka</Text>
              <Text style={[styles.detailValue, styles.plateVal]}>{offer.vehicle.plate}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Yıl</Text>
              <Text style={styles.detailValue}>{offer.vehicle.year}</Text>
            </View>
            <View style={styles.badgeRow}>
              <DocBadge label="Sigorta" />
              <DocBadge label="Muayene" />
              <DocBadge label="K Yetki" />
            </View>
          </View>
        )}

        {/* NOT */}
        {offer.note && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servisçinin Notu</Text>
            <Text style={styles.noteText}>{offer.note}</Text>
          </View>
        )}

        {/* YORUMLAR — public endpoint'ten yüklenir */}
        {reviews && reviews.total > 0 && (
          <View style={styles.section}>
            <View style={styles.commentsHeader}>
              <Text style={styles.sectionTitle}>Veli Yorumları</Text>
              <Text style={styles.commentCount}>· {reviews.total}</Text>
            </View>

            <View style={styles.avgRow}>
              <Text style={styles.avgStars}>{starsStr(reviews.avg)}</Text>
              <Text style={styles.avgNum}>{reviews.avg.toFixed(1)}</Text>
              <Text style={styles.avgTotal}>{reviews.total} değerlendirme</Text>
            </View>

            {reviews.reviews.slice(0, 5).map((r, i) => (
              <View key={i} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewInitials}>
                    <Text style={styles.reviewInitialsText}>{r.parentInitials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewStars}>{starsStr(r.rating)}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(r.createdAt).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
                {r.comment && (
                  <Text style={styles.reviewText}>"{r.comment}"</Text>
                )}
              </View>
            ))}

            {reviews.total > 5 && (
              <Text style={styles.commentMore}>+ {reviews.total - 5} yorum daha</Text>
            )}
          </View>
        )}

        {reviews && reviews.total === 0 && (
          <View style={styles.section}>
            <View style={styles.commentPlaceholder}>
              <Text style={styles.commentPlaceholderText}>Henüz yorum yok</Text>
              <Text style={styles.commentPlaceholderSub}>
                Bu servisçi Bindi'de yeni. Belgeleri kontrol edildikten sonra teklif verebiliyor.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Alt sabit karar bölümü */}
      <View style={styles.offerSheet}>
        <View style={styles.offerSheetHandle} />
        <View style={styles.offerSheetRow}>
          <View>
            <Text style={styles.offerSheetLabel}>Aylık Teklif</Text>
            <Text style={styles.offerSheetPrice}>
              {Number(offer.monthlyPrice).toLocaleString('tr-TR')}
              <Text style={styles.offerSheetUnit}> ₺/ay</Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.offerSheetLabel}>Sözleşme</Text>
            <Text style={styles.offerSheetSub}>{contract.label}</Text>
          </View>
        </View>
        <Pressable
          onPress={selectOffer}
          disabled={selecting}
          style={({ pressed }) => [
            styles.primaryCta,
            (pressed || selecting) && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.primaryCtaText}>
            {selecting ? 'Seçiliyor...' : 'Bu Servisçiyi Seç'}
          </Text>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.dark} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 6L9 17l-5-5" />
          </Svg>
        </Pressable>
        <Text style={styles.legal}>Seçtiğinde iletişim + adres onunla paylaşılır</Text>
      </View>
    </SafeAreaView>
  );
}

function StatBox({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statBoxLabel}>{label}</Text>
      <Text style={styles.statBoxValue}>
        {value}
        {unit && <Text style={styles.statBoxUnit}> {unit}</Text>}
      </Text>
    </View>
  );
}

function DocBadge({ label }: { label: string }) {
  return (
    <View style={styles.docBadge}>
      <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M20 6L9 17l-5-5" />
      </Svg>
      <Text style={styles.docBadgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card, gap: 10,
  },
  back: { padding: 6, width: 32 },
  backText: { fontSize: 24, color: colors.dark },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.dark, letterSpacing: -0.2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorBox: { padding: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 10 },
  errorText: { color: '#991B1B', fontSize: 15, fontWeight: '600' },
  body: { padding: 16, paddingBottom: 220 },

  // HERO
  hero: { padding: 16, borderRadius: 16, gap: 12 },
  heroTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  heroTagText: { fontSize: 10, fontWeight: '800', color: '#78350F', letterSpacing: 0.5 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: 'rgba(120, 53, 15, 0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#78350F' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 15, color: '#78350F', fontWeight: '600', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  ratingStars: { fontSize: 15, color: colors.primaryDark, letterSpacing: 0.5 },
  ratingNum: { fontSize: 15, fontWeight: '800', color: colors.dark },
  ratingMeta: { fontSize: 15, color: '#78350F', fontWeight: '600' },

  statGrid: { flexDirection: 'row', gap: 6 },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 8, padding: 8, gap: 2,
  },
  statBoxLabel: {
    fontSize: 9, fontWeight: '700', color: '#78350F',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  statBoxValue: { fontSize: 16, fontWeight: '800', color: colors.dark, letterSpacing: -0.3 },
  statBoxUnit: { fontSize: 10, fontWeight: '700', color: '#78350F' },

  distanceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: colors.blueSoft,
    borderRadius: 12, borderWidth: 1, borderColor: '#93C5FD',
    marginTop: 12,
  },
  distanceIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  distanceLabel: {
    fontSize: 10, fontWeight: '700', color: '#1E40AF',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  distanceValue: { fontSize: 15, fontWeight: '800', color: colors.dark, marginTop: 2 },
  distanceMuted: { color: colors.muted, fontWeight: '600' },

  section: {
    padding: 14, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, marginTop: 12, gap: 8,
  },
  sectionTitle: {
    fontSize: 15, fontWeight: '800', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 5,
  },
  detailLabel: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  detailValue: { fontSize: 15, color: colors.dark, fontWeight: '700' },
  plateVal: {
    fontFamily: 'Courier', backgroundColor: colors.primary,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  docBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.successSoft, borderColor: '#A7F3D0', borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  docBadgeText: { fontSize: 10, fontWeight: '800', color: '#065F46' },

  noteText: { fontSize: 15, color: colors.dark, lineHeight: 18 },

  commentsHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  commentCount: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  commentPlaceholder: { paddingVertical: 8, alignItems: 'flex-start', gap: 4 },
  commentPlaceholderText: { fontSize: 15, color: colors.dark, fontWeight: '700' },
  commentPlaceholderSub: { fontSize: 15, color: colors.muted, lineHeight: 16 },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avgStars: { fontSize: 15, color: colors.primaryDark, letterSpacing: 2 },
  avgNum: { fontSize: 18, fontWeight: '800', color: colors.dark },
  avgTotal: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  reviewCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewInitials: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewInitialsText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: 0.5,
  },
  reviewStars: { fontSize: 15, color: colors.primaryDark, letterSpacing: 2 },
  reviewDate: { fontSize: 10, color: colors.muted, marginTop: 2 },
  reviewText: {
    fontSize: 15,
    color: colors.dark,
    lineHeight: 19,
    fontStyle: 'italic',
    marginLeft: 42,
  },
  commentMore: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },

  // Alt sabit bölüm
  offerSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderTopColor: colors.border,
    padding: 16, paddingTop: 8, paddingBottom: 22,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  offerSheetHandle: {
    width: 36, height: 4, backgroundColor: colors.borderStrong,
    borderRadius: 2, alignSelf: 'center', marginBottom: 12,
  },
  offerSheetRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12,
  },
  offerSheetLabel: {
    fontSize: 10, fontWeight: '700', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  offerSheetPrice: {
    fontSize: 26, fontWeight: '800', color: colors.dark,
    letterSpacing: -0.5, marginTop: 4,
  },
  offerSheetUnit: { fontSize: 15, color: colors.muted, fontWeight: '700' },
  offerSheetSub: { fontSize: 15, fontWeight: '700', color: colors.dark, marginTop: 4 },
  primaryCta: {
    backgroundColor: colors.primary,
    paddingVertical: 15, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  primaryCtaText: { color: colors.dark, fontWeight: '800', fontSize: 15 },
  legal: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 8 },
});
