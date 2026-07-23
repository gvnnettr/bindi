import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
  selectedAt: string | null;
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
  status: 'open' | 'closed' | 'cancelled';
  city: string;
  district: string;
  neighborhood: string | null;
  pickupType: string | null;
  createdAt: string;
  magicToken: string;
  students: Array<{ name: string; school: string | null }>;
  offers: OfferItem[];
}

type SortKey = 'rating' | 'price' | 'nearby' | 'experience';

function stars(avg: number | null): string {
  if (avg == null) return '☆☆☆☆☆';
  const n = Math.round(avg);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function pickupChips(t: string | null): string[] {
  if (!t) return [];
  const map: Record<string, string[]> = {
    both: ['Sabah', 'Akşam'],
    morning_only: ['Sabah'],
    afternoon_only: ['Akşam'],
  };
  return map[t] ?? [];
}

// Talep açılışından itibaren 30 gün süre kalır varsayımı
function timeRemainingChip(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  const expires = created + 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const remaining = expires - now;
  if (remaining <= 0) return 'süresi doldu';
  const day = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hour = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (day > 0) return `${day}g ${hour}sa`;
  return `${hour}sa`;
}

export default function VeliTalepDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [request, setRequest] = useState<ParentRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('rating');

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const all = await api.get<ParentRequest[]>('/me/parent/requests', token);
      const found = all.find((r) => r.id === id) ?? null;
      setRequest(found);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [id, token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function selectOffer(offerId: string) {
    if (!request) return;
    Alert.alert(
      'Bu servisçiyi seç',
      'Seçtikten sonra diğer teklifler kapanır. Devam edilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Seç',
          style: 'default',
          onPress: async () => {
            setSelecting(offerId);
            try {
              await api.post(
                `/requests/${request.magicToken}/offers/select`,
                { offerId },
              );
              await load();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : (e as Error).message);
            } finally {
              setSelecting(null);
            }
          },
        },
      ],
    );
  }

  async function unselect() {
    if (!request) return;
    Alert.alert(
      'Seçimi geri al',
      'Servisçinin seçimini iptal etmek istiyor musun? Diğer teklifler tekrar aktif olacak.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/me/parent/requests/${request.id}/unselect`, {}, token);
              await load();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : (e as Error).message);
            }
          },
        },
      ],
    );
  }

  async function cancelReq() {
    if (!request) return;
    Alert.alert(
      'Talebi iptal et',
      'Talep tamamen kapanacak, artık teklif alamazsın. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Talebi İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/me/parent/requests/${request.id}/cancel`, {}, token);
              router.back();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : (e as Error).message);
            }
          },
        },
      ],
    );
  }

  const selected = useMemo(
    () => request?.offers.find((o) => o.status === 'selected') ?? null,
    [request],
  );

  const pendingOffers = useMemo(
    () => (selected ? [] : (request?.offers ?? []).filter((o) => o.status === 'pending')),
    [request, selected],
  );

  const sortedOffers = useMemo(() => {
    const list = [...pendingOffers];
    switch (sortBy) {
      case 'rating':
        list.sort((a, b) => (b.provider.rating?.avg ?? 0) - (a.provider.rating?.avg ?? 0));
        break;
      case 'price':
        list.sort((a, b) => Number(a.monthlyPrice) - Number(b.monthlyPrice));
        break;
      case 'experience':
        list.sort((a, b) => (b.provider.rating?.count ?? 0) - (a.provider.rating?.count ?? 0));
        break;
      case 'nearby':
        // Yakınlık backend'de yok; sabit sıralama
        break;
    }
    return list;
  }, [pendingOffers, sortBy]);

  const schoolName = request?.students?.[0]?.school ?? 'Talep';
  const studentName = request?.students?.[0]?.name;
  const chips = pickupChips(request?.pickupType ?? null);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{schoolName}</Text>
        {request?.status === 'open' && !selected ? (
          <View style={styles.timeChip}>
            <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#78350F" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 8v4l3 3M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />
            </Svg>
            <Text style={styles.timeText}>{timeRemainingChip(request.createdAt)}</Text>
          </View>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {!request ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.muted} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {selected ? (
            <View style={styles.selectedCard}>
              <View style={styles.selBadgeRow}>
                <View style={styles.wonBadge}>
                  <Text style={styles.wonBadgeText}>SEÇTİĞİN SERVİSÇİ</Text>
                </View>
              </View>
              <Text style={styles.selCompany}>{selected.provider.companyName}</Text>
              <Text style={styles.selOwner}>{selected.provider.ownerName}</Text>

              <View style={styles.selPrice}>
                <Text style={styles.selPriceValue}>
                  ₺{Number(selected.monthlyPrice).toLocaleString('tr-TR')}
                </Text>
                <Text style={styles.selPriceUnit}> /ay</Text>
              </View>

              {selected.vehicle && (
                <View style={styles.selRow}>
                  <Text style={styles.selRowLabel}>Araç</Text>
                  <Text style={styles.selRowValue}>
                    {selected.vehicle.brand} {selected.vehicle.model} {selected.vehicle.year} · {selected.vehicle.seats} kişilik · {selected.vehicle.plate}
                  </Text>
                </View>
              )}

              {selected.provider.phone && (
                <View style={styles.contactRow}>
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${selected.provider.phone}`)}
                    style={styles.contactBtn}
                  >
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.dark} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </Svg>
                    <Text style={styles.contactBtnText}>Ara</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => Linking.openURL(`whatsapp://send?phone=${selected.provider.phone!.replace(/\D/g, '')}`)}
                    style={[styles.contactBtn, styles.contactBtnWa]}
                  >
                    <Text style={styles.contactBtnWaText}>WhatsApp</Text>
                  </Pressable>
                </View>
              )}

              <Pressable
                onPress={() => router.push({
                  pathname: '/(app)/veli/puanla/[offerId]',
                  params: { offerId: selected.id, companyName: selected.provider.companyName },
                })}
                style={styles.rateBtn}
              >
                <Text style={styles.rateBtnText}>★ Servisçiyi Puanla</Text>
              </Pressable>
              <Pressable onPress={unselect} style={styles.unselectBtn}>
                <Text style={styles.unselectText}>Seçimi geri al</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>TALEBİNİZE GELEN</Text>
                <Text style={styles.infoBig}>
                  {pendingOffers.length} teklif
                </Text>
                <Text style={styles.infoSub}>
                  {studentName ? `${studentName} için · ` : ''}{request.district}
                  {chips.length > 0 ? ` · ${chips.join(' + ')}` : ''}
                </Text>
              </View>

              {pendingOffers.length > 0 && (
                <View style={styles.sortRow}>
                  <SortChip label="Puan" active={sortBy === 'rating'} onPress={() => setSortBy('rating')} />
                  <SortChip label="Fiyat" active={sortBy === 'price'} onPress={() => setSortBy('price')} />
                  <SortChip label="Yakınlık" active={sortBy === 'nearby'} onPress={() => setSortBy('nearby')} />
                  <SortChip label="Deneyim" active={sortBy === 'experience'} onPress={() => setSortBy('experience')} />
                </View>
              )}

              {pendingOffers.length === 0 && (
                <View style={styles.emptyOffers}>
                  <Text style={styles.emptyOffersTitle}>Teklif bekleniyor</Text>
                  <Text style={styles.emptyOffersSub}>
                    Talebin servisçilere iletildi. Teklifler geldiğinde bildirim alacaksın.
                  </Text>
                </View>
              )}

              {sortedOffers.map((o, i) => (
                <OfferCard
                  key={o.id}
                  offer={o}
                  isTopPick={i === 0 && sortBy === 'rating' && sortedOffers.length > 1}
                  onSelect={() => router.push({
                    pathname: '/(app)/veli/servisci/[offerId]',
                    params: { offerId: o.id, requestId: request.id },
                  })}
                  loading={selecting === o.id}
                />
              ))}
            </>
          )}

          {request.status === 'open' && (
            <Pressable onPress={cancelReq} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Talebi tamamen iptal et</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SortChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.sortChip, active && styles.sortChipActive]}>
      <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function OfferCard({
  offer,
  isTopPick,
  onSelect,
  loading,
}: {
  offer: OfferItem;
  isTopPick: boolean;
  onSelect: () => void;
  loading: boolean;
}) {
  return (
    <View style={[styles.offerCard, isTopPick && styles.offerCardTop]}>
      {isTopPick && (
        <View style={styles.topPickBadge}>
          <Text style={styles.topPickText}>EN YÜKSEK PUAN</Text>
        </View>
      )}

      <View style={styles.offerHead}>
        <View style={[styles.avatar, isTopPick && styles.avatarTop]}>
          <Text style={styles.avatarText}>{initials(offer.provider.companyName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.offerCompany}>{offer.provider.companyName}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStars}>{stars(offer.provider.rating?.avg ?? null)}</Text>
            <Text style={styles.ratingNum}>
              {offer.provider.rating?.avg ? offer.provider.rating.avg.toFixed(1) : '—'}
            </Text>
            {offer.provider.rating && offer.provider.rating.count > 0 && (
              <Text style={styles.ratingMeta}>
                · {offer.provider.rating.count} yorum
              </Text>
            )}
          </View>
        </View>
      </View>

      {offer.vehicle && (
        <Text style={styles.offerVehicle} numberOfLines={1}>
          🚌 {offer.vehicle.brand} {offer.vehicle.model} · {offer.vehicle.seats} kişilik
        </Text>
      )}

      {offer.note && (
        <Text style={styles.offerNote} numberOfLines={2}>
          {offer.note}
        </Text>
      )}

      <View style={styles.divider} />

      <View style={styles.offerFoot}>
        <View>
          <Text style={styles.footPrice}>
            {Number(offer.monthlyPrice).toLocaleString('tr-TR')}
            <Text style={styles.footPriceUnit}> ₺/ay</Text>
          </Text>
        </View>
        <Pressable
          onPress={onSelect}
          disabled={loading}
          style={[
            styles.inspectBtn,
            isTopPick ? styles.inspectBtnPrimary : styles.inspectBtnDark,
            loading && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.inspectBtnText, isTopPick ? styles.inspectBtnTextPrimary : styles.inspectBtnTextDark]}>
            {loading ? 'Seçiliyor…' : 'İncele →'}
          </Text>
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
    backgroundColor: colors.card, gap: 10,
  },
  back: { padding: 6, width: 32 },
  backText: { fontSize: 24, color: colors.dark },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.dark, letterSpacing: -0.2 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  timeText: { fontSize: 11, fontWeight: '800', color: '#78350F' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, paddingBottom: 40, gap: 12 },
  errorBox: { padding: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 10 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },

  infoCard: {
    padding: 16, backgroundColor: colors.blueSoft, borderRadius: 14,
    borderWidth: 1, borderColor: '#93C5FD',
  },
  infoLabel: {
    fontSize: 10, fontWeight: '800', color: '#1E40AF',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },
  infoBig: { fontSize: 22, fontWeight: '800', color: '#1E40AF', letterSpacing: -0.5 },
  infoSub: { fontSize: 12, color: '#1E40AF', marginTop: 4, fontWeight: '600' },

  sortRow: { flexDirection: 'row', gap: 6 },
  sortChip: {
    flex: 1, paddingVertical: 9, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortChipText: { fontSize: 12, fontWeight: '700', color: colors.dark },
  sortChipTextActive: { color: colors.dark },

  emptyOffers: {
    padding: 30, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  emptyOffersTitle: { fontSize: 14, fontWeight: '800', color: colors.dark },
  emptyOffersSub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },

  offerCard: {
    padding: 14, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, gap: 6,
    position: 'relative',
  },
  offerCardTop: { borderColor: colors.primary, borderWidth: 2 },
  topPickBadge: {
    position: 'absolute', top: -10, left: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    zIndex: 1,
  },
  topPickText: { fontSize: 10, fontWeight: '800', color: colors.dark, letterSpacing: 0.5 },

  offerHead: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTop: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  avatarText: { fontSize: 14, fontWeight: '800', color: colors.dark },
  offerCompany: { fontSize: 14, fontWeight: '800', color: colors.dark },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  ratingStars: { fontSize: 11, color: colors.primary, letterSpacing: 0.5 },
  ratingNum: { fontSize: 11, color: colors.dark, fontWeight: '800' },
  ratingMeta: { fontSize: 11, color: colors.muted, fontWeight: '600' },

  offerVehicle: { fontSize: 11, color: colors.muted, fontWeight: '600', marginTop: 2 },
  offerNote: { fontSize: 12, color: colors.muted, lineHeight: 17 },

  divider: { height: 1, backgroundColor: colors.border, borderStyle: 'dashed', marginVertical: 4 },
  offerFoot: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footPrice: { fontSize: 20, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  footPriceUnit: { fontSize: 11, color: colors.muted, fontWeight: '700' },

  inspectBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
  },
  inspectBtnPrimary: { backgroundColor: colors.primary },
  inspectBtnDark: { backgroundColor: colors.dark },
  inspectBtnText: { fontSize: 13, fontWeight: '800' },
  inspectBtnTextPrimary: { color: colors.dark },
  inspectBtnTextDark: { color: '#fff' },

  // Selected card (aynı kalır)
  selectedCard: {
    padding: 18, backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 2, borderColor: colors.success, gap: 8,
  },
  selBadgeRow: { flexDirection: 'row', marginBottom: 4 },
  wonBadge: {
    backgroundColor: colors.successSoft, borderColor: '#A7F3D0',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  wonBadgeText: { fontSize: 9, fontWeight: '800', color: '#065F46', letterSpacing: 0.8 },
  selCompany: { fontSize: 18, fontWeight: '800', color: colors.dark, letterSpacing: -0.3 },
  selOwner: { fontSize: 12, color: colors.muted, marginTop: -4 },
  selPrice: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, marginBottom: 4 },
  selPriceValue: { fontSize: 34, fontWeight: '800', color: colors.dark, letterSpacing: -1 },
  selPriceUnit: { fontSize: 15, fontWeight: '600', color: colors.muted },
  selRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 4 },
  selRowLabel: {
    fontSize: 10, fontWeight: '800', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, width: 50, marginTop: 3,
  },
  selRowValue: { flex: 1, fontSize: 12, color: colors.dark, fontWeight: '600' },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong,
  },
  contactBtnText: { fontSize: 13, fontWeight: '700', color: colors.dark },
  contactBtnWa: { backgroundColor: '#25D366', borderColor: '#25D366' },
  contactBtnWaText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  rateBtn: {
    marginTop: 12, padding: 12, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  rateBtnText: { color: colors.dark, fontWeight: '800', fontSize: 13 },
  unselectBtn: { marginTop: 8, padding: 8 },
  unselectText: {
    color: colors.muted, fontSize: 12, fontWeight: '700',
    textDecorationLine: 'underline', textAlign: 'center',
  },

  cancelBtn: { marginTop: 16, padding: 12, alignItems: 'center' },
  cancelText: { color: colors.danger, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
});
