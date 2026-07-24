import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../../src/api/client';
import { useAuth } from '../../../../src/state/auth';
import { Button, ErrorBanner, Input, InfoBanner } from '../../../../src/components/ui';
import { RouteMap } from '../../../../src/components/RouteMap';
import { colors } from '../../../../src/theme/colors';

interface Detail {
  id: string;
  status: string;
  city: string;
  district: string;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  pickupType: string | null;
  notes: string | null;
  createdAt: string;
  distanceKm: number | null;
  etaMin: number | null;
  hasLocation: boolean;
  firstSchoolLocation: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  } | null;
  parent: { name: string; phone: string };
  students: Array<{
    name: string;
    class: string | null;
    school: { id: string; name: string } | null;
  }>;
  myOffers?: Array<{
    id: string;
    monthlyPrice: string;
    note: string | null;
    status: string;
    vehicle: { id: string; brand: string; model: string; plate: string } | null;
  }>;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  seats: number;
}

interface OfferStats {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
}

export default function TalepDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<OfferStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const [d, vs, st] = await Promise.all([
        api.get<Detail>(`/me/requests/${id}`, token),
        api.get<Vehicle[]>('/me/vehicles', token),
        api.get<OfferStats>(`/me/requests/${id}/offer-stats`, token),
      ]);
      setDetail(d);
      setVehicles(vs);
      setStats(st);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [id, token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const hasOffer = (detail?.myOffers?.length ?? 0) > 0;
  const myOffer = detail?.myOffers?.[0];
  const isWon = myOffer?.status === 'selected';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Talep Detayı</Text>
        <View style={{ width: 32 }} />
      </View>

      {!detail ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.muted} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {error && <ErrorBanner message={error} />}
          {notice && <InfoBanner message={notice} />}

          {isWon && (
            <View style={styles.wonBanner}>
              <Text style={styles.wonTitle}>🎉 Bu işi kazandın</Text>
              <Text style={styles.wonSub}>Veli seni seçti — iletişim bilgileri aşağıda</Text>
            </View>
          )}

          <View style={styles.card}>
            <SectionLabel>Öğrenci{detail.students.length > 1 ? 'ler' : ''}</SectionLabel>
            {detail.students.map((s, i) => (
              <View key={i} style={styles.studentRow}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.studentClass}>
                  {s.class ?? '—'}
                  {s.school ? ` · ${s.school.name}` : ''}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <SectionLabel>Adres</SectionLabel>
            <Text style={styles.body14}>
              {detail.city} · {detail.district}
              {detail.neighborhood ? ` · ${detail.neighborhood}` : ''}
            </Text>
            {detail.address && isWon && (
              <Text style={styles.bodyMuted}>{detail.address}</Text>
            )}
            {!isWon && detail.address && (
              <Text style={styles.hint}>Tam adres, teklifin kabul edilirse görünür</Text>
            )}
            {detail.distanceKm != null && detail.etaMin != null && (
              <View style={styles.distanceChip}>
                <Text style={styles.distanceText}>
                  📍 Okula {detail.distanceKm} km · ~{detail.etaMin} dk
                </Text>
              </View>
            )}
          </View>

          {detail.latitude != null && detail.longitude != null && detail.firstSchoolLocation && (
            <RouteMap
              home={{ latitude: detail.latitude, longitude: detail.longitude }}
              school={{
                latitude: detail.firstSchoolLocation.latitude,
                longitude: detail.firstSchoolLocation.longitude,
                name: detail.firstSchoolLocation.name,
              }}
              distanceKm={detail.distanceKm}
              etaMin={detail.etaMin}
            />
          )}

          <View style={styles.card}>
            <SectionLabel>Veli</SectionLabel>
            <Text style={styles.body14}>{detail.parent.name}</Text>
            <Text style={styles.bodyMuted}>{detail.parent.phone}</Text>
            {hasOffer && detail.parent.phone && !detail.parent.phone.includes('*') && (
              <View style={styles.contactRow}>
                <Pressable
                  onPress={() => Linking.openURL(`tel:${detail.parent.phone}`)}
                  style={styles.contactBtn}
                >
                  <Text style={styles.contactBtnEmoji}>📞</Text>
                  <Text style={styles.contactBtnText}>Ara</Text>
                </Pressable>
                <Pressable
                  onPress={() => Linking.openURL(`whatsapp://send?phone=${detail.parent.phone.replace(/\D/g, '')}`)}
                  style={[styles.contactBtn, styles.contactBtnWa]}
                >
                  <Text style={styles.contactBtnWaText}>WhatsApp</Text>
                </Pressable>
              </View>
            )}
            {!hasOffer && (
              <Text style={styles.hint}>İsim/telefon teklif verince tam açılır</Text>
            )}
          </View>

          {detail.pickupType && (
            <View style={styles.card}>
              <SectionLabel>Servis Tercihi</SectionLabel>
              <Text style={styles.body14}>{pickupLabel(detail.pickupType)}</Text>
            </View>
          )}

          {detail.notes && (
            <View style={styles.card}>
              <SectionLabel>Veli Notu</SectionLabel>
              <Text style={styles.body14}>{detail.notes}</Text>
            </View>
          )}

          {stats && stats.count > 0 && (
            <View style={styles.competitorCard}>
              <View style={styles.competitorHeader}>
                <Text style={styles.competitorLabel}>
                  RAKİP TEKLİFLER · {stats.count} SERVİSÇİ
                </Text>
                {stats.avg != null && (
                  <Text style={styles.competitorAvg}>ort. {stats.avg.toLocaleString('tr-TR')} ₺</Text>
                )}
              </View>
              <View style={styles.competitorRow}>
                {stats.min != null && (
                  <View style={styles.competitorCell}>
                    <Text style={styles.competitorCellLabel}>MİN</Text>
                    <Text style={styles.competitorCellValue}>{stats.min.toLocaleString('tr-TR')} ₺</Text>
                  </View>
                )}
                {stats.avg != null && (
                  <View style={styles.competitorCell}>
                    <Text style={styles.competitorCellLabel}>ORT.</Text>
                    <Text style={[styles.competitorCellValue, { color: colors.primaryDark }]}>
                      {stats.avg.toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                )}
                {stats.max != null && (
                  <View style={styles.competitorCell}>
                    <Text style={styles.competitorCellLabel}>MAX</Text>
                    <Text style={styles.competitorCellValue}>{stats.max.toLocaleString('tr-TR')} ₺</Text>
                  </View>
                )}
              </View>
              <Text style={styles.competitorHint}>
                Bu talebe {stats.count} servisçi teklif verdi. Veli fiyat + puanın + geçmiş yorumlarla birini seçecek.
              </Text>
            </View>
          )}

          {hasOffer && myOffer && (
            <View style={[styles.card, styles.offerCard]}>
              <SectionLabel>Verdiğin Teklif</SectionLabel>
              <Text style={styles.offerPrice}>
                ₺{Number(myOffer.monthlyPrice).toLocaleString('tr-TR')}
                <Text style={styles.offerPriceUnit}> /ay</Text>
              </Text>
              {myOffer.vehicle && (
                <Text style={styles.bodyMuted}>
                  {myOffer.vehicle.brand} {myOffer.vehicle.model} · {myOffer.vehicle.plate}
                </Text>
              )}
              {myOffer.note && <Text style={styles.body14}>{myOffer.note}</Text>}
              <View
                style={[
                  styles.statusPill,
                  isWon ? styles.statusPillSuccess : styles.statusPillWarning,
                ]}
              >
                <Text style={[styles.statusText, isWon ? styles.statusTextSuccess : styles.statusTextWarning]}>
                  {isWon ? 'Kazandın · Veli seni seçti' : 'Bekliyor · Veli değerlendiriyor'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {detail && !hasOffer && (
        <View style={styles.footer}>
          <Pressable
            onPress={() => setModal(true)}
            style={({ pressed }) => [styles.primaryCta, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.primaryCtaText}>Teklif Ver</Text>
          </Pressable>
        </View>
      )}

      <OfferModal
        visible={modal}
        onClose={() => setModal(false)}
        vehicles={vehicles}
        onSubmit={async (payload) => {
          if (!token || !id) return;
          try {
            await api.post('/me/offers', { requestId: id, ...payload }, token);
            setModal(false);
            setNotice('Teklifin gönderildi. Veli değerlendirecek.');
            setTimeout(() => setNotice(null), 3000);
            await load();
          } catch (e) {
            throw e;
          }
        }}
      />
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function pickupLabel(t: string): string {
  const map: Record<string, string> = {
    both: 'Gidiş + Dönüş',
    morning: 'Sadece Sabah (gidiş)',
    evening: 'Sadece Akşam (dönüş)',
    lunch: 'Öğle Servisi',
  };
  return map[t] ?? t;
}

function OfferModal({
  visible,
  onClose,
  vehicles,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onSubmit: (payload: { monthlyPrice: string; vehicleId?: string; note?: string }) => Promise<void>;
}) {
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!price || Number(price) < 100) {
      setError('Geçerli bir aylık ücret gir (min ₺100)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        monthlyPrice: price,
        vehicleId: vehicleId ?? undefined,
        note: note.trim() || undefined,
      });
      setPrice('');
      setNote('');
      setVehicleId(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={modalStyles.sheet}>
            <View style={modalStyles.grabber} />
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Teklif Ver</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={modalStyles.close}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={modalStyles.body}>
              <ErrorBanner message={error} />
              <Input
                label="Aylık Ücret (₺)"
                value={price}
                onChangeText={(v) => setPrice(v.replace(/\D/g, ''))}
                placeholder="2500"
                keyboardType="number-pad"
                autoFocus
                hint="Sadece rakam · Aylık toplam"
              />

              {vehicles.length > 0 && (
                <>
                  <Text style={modalStyles.subLabel}>Araç seç (opsiyonel)</Text>
                  <View style={modalStyles.vehicleGrid}>
                    <Pressable
                      onPress={() => setVehicleId(null)}
                      style={[modalStyles.vehicleChip, vehicleId === null && modalStyles.vehicleChipActive]}
                    >
                      <Text style={[modalStyles.vehicleChipText, vehicleId === null && modalStyles.vehicleChipTextActive]}>
                        Belirtme
                      </Text>
                    </Pressable>
                    {vehicles.map((v) => (
                      <Pressable
                        key={v.id}
                        onPress={() => setVehicleId(v.id)}
                        style={[modalStyles.vehicleChip, vehicleId === v.id && modalStyles.vehicleChipActive]}
                      >
                        <Text style={[modalStyles.vehicleChipText, vehicleId === v.id && modalStyles.vehicleChipTextActive]}>
                          {v.brand} {v.model} · {v.seats}k
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <Input
                label="Not (opsiyonel)"
                value={note}
                onChangeText={setNote}
                placeholder="Ek bilgi, hizmet detayı, promosyon..."
                multiline
                numberOfLines={3}
                style={{ minHeight: 70, textAlignVertical: 'top' }}
              />

              <Button
                label={loading ? 'Gönderiliyor...' : 'Teklifi Gönder'}
                loading={loading}
                onPress={submit}
                style={{ marginTop: 8 }}
              />
              <Text style={modalStyles.hint}>
                Gönderdikten sonra teklifin üzerinde değişiklik yapamazsın. Veli ile iletişim, teklif seçildiğinde açılır.
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  grabber: {
    width: 40,
    height: 4,
    backgroundColor: colors.borderStrong,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  close: { fontSize: 20, color: colors.muted, fontWeight: '700' },
  body: { padding: 20, gap: 4 },
  subLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  vehicleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vehicleChipText: { fontSize: 15, fontWeight: '700', color: colors.dark },
  vehicleChipTextActive: { color: colors.dark },
  hint: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});

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
  body: { padding: 20, paddingBottom: 100, gap: 10 },
  wonBanner: {
    backgroundColor: colors.successSoft,
    borderColor: '#A7F3D0',
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  wonTitle: { fontSize: 15, fontWeight: '800', color: '#065F46' },
  wonSub: { fontSize: 15, color: '#065F46', marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offerCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  body14: { fontSize: 15, color: colors.dark, lineHeight: 20 },
  bodyMuted: { fontSize: 15, color: colors.muted, marginTop: 2, lineHeight: 18 },
  hint: { fontSize: 15, color: colors.muted, marginTop: 6, fontStyle: 'italic' },
  studentRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  studentName: { fontSize: 15, fontWeight: '700', color: colors.dark },
  studentClass: { fontSize: 15, color: colors.muted, marginTop: 2 },
  offerPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: -1,
    marginBottom: 4,
  },
  offerPriceUnit: { fontSize: 15, fontWeight: '600' },
  statusPill: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusPillSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: '#A7F3D0',
  },
  statusPillWarning: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  statusText: { fontSize: 15, fontWeight: '700' },
  statusTextSuccess: { color: '#065F46' },
  statusTextWarning: { color: colors.muted },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#fff',
  },
  primaryCta: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryCtaText: { color: colors.dark, fontWeight: '800', fontSize: 15 },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong,
  },
  contactBtnEmoji: { fontSize: 14 },
  contactBtnText: { fontSize: 15, fontWeight: '700', color: colors.dark },
  contactBtnWa: { backgroundColor: '#25D366', borderColor: '#25D366' },
  contactBtnWaText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  distanceChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.blueSoft,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  distanceText: { fontSize: 15, fontWeight: '700', color: '#1E40AF' },
  competitorCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  competitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  competitorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.5,
  },
  competitorAvg: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark,
  },
  competitorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  competitorCell: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.bg,
    borderRadius: 10,
    alignItems: 'center',
  },
  competitorCellLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  competitorCellValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark,
  },
  competitorHint: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 16,
  },
});
