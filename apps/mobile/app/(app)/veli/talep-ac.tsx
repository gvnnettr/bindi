import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { Button, ErrorBanner, Input } from '../../../src/components/ui';
import { colors } from '../../../src/theme/colors';

interface Student {
  id: string;
  name: string;
  class: string | null;
  school: { id: string; name: string; city: string; district: string } | null;
  isOwner: boolean;
}

type PickupType = 'both' | 'morning_only' | 'afternoon_only';

const STEPS = ['Öğrenci', 'Adres', 'Tercihler', 'Onay'];

export default function TalepAcScreen() {
  const { token } = useAuth();
  const [step, setStep] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [enabledCities, setEnabledCities] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');

  const [pickupType, setPickupType] = useState<PickupType>('both');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function autoFillLocation() {
    setError(null);
    setLocLoading(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setError('Konum izni verilmedi. Ayarlar > Bindi > Konum bölümünden izin ver.');
        setLocLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (place) {
          if (place.region) setCity(place.region);
          if (place.subregion || place.city) setDistrict(place.subregion ?? place.city ?? '');
          if (place.district || place.street) setNeighborhood(place.district ?? '');
          const streetPart = [place.street, place.name].filter(Boolean).join(' No: ');
          if (streetPart) setAddress(streetPart);
        }
      } catch {}
    } catch (e) {
      setError('Konum alınamadı: ' + (e as Error).message);
    } finally {
      setLocLoading(false);
    }
  }

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!token) return;
      try {
        const [s, cities] = await Promise.all([
          api.get<Student[]>('/me/parent/students', token),
          api.get<string[]>('/cities/public'),
        ]);
        setStudents(s);
        setEnabledCities(cities);
        // Auto-fill: öğrencinin okuluna göre şehir/ilçe pre-fill (sadece enabled şehirse)
        if (s.length > 0 && s[0].school && cities.includes(s[0].school.city)) {
          setCity((prev) => prev || s[0].school!.city);
          setDistrict((prev) => prev || s[0].school!.district);
        } else if (cities.length === 1) {
          setCity((prev) => prev || cities[0]);
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : (e as Error).message);
      }
    })();
  }, [token]));

  function canProceed(): boolean {
    if (step === 0) return selectedIds.length > 0;
    if (step === 1) return !!(city && district && neighborhood && address.length >= 5);
    if (step === 2) return !!pickupType;
    return true;
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const created = await api.post<{ id: string }>(
        '/me/parent/requests',
        {
          studentIds: selectedIds,
          city,
          district,
          neighborhood,
          address,
          pickupType,
          notes: notes.trim() || undefined,
          latitude: coords?.lat,
          longitude: coords?.lng,
        },
        token,
      );
      router.replace(`/(app)/veli/talep/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
      setLoading(false);
    }
  }

  const selectedStudents = students.filter((s) => selectedIds.includes(s.id));

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
            <Pressable onPress={() => step === 0 ? router.back() : setStep(step - 1)} style={styles.back} hitSlop={12}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Image source={require('../../../assets/bindi-logo.png')} style={styles.heroLogo} resizeMode="contain" />
            <View style={{ width: 32 }} />
          </View>

          <View style={styles.stepBar}>
            {STEPS.map((s, i) => (
              <View key={i} style={styles.stepWrap}>
                <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                  <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
              </View>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />

          {step === 0 && (
            <>
              <Text style={styles.stepTitle}>Öğrenci seç</Text>
              <Text style={styles.stepSub}>Bu talep hangi çocuğun için?</Text>

              {students.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>Öğrenci yok</Text>
                  <Text style={styles.emptySub}>Devam etmek için önce Öğrenciler sekmesinden çocuğunu ekle.</Text>
                </View>
              ) : (
                <View style={styles.studentList}>
                  {students.map((s) => {
                    const active = selectedIds.includes(s.id);
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setSelectedIds((prev) => active ? prev.filter((x) => x !== s.id) : [...prev, s.id])}
                        style={[styles.studentCard, active && styles.studentCardActive]}
                      >
                        <View style={[styles.checkBox, active && styles.checkBoxActive]}>
                          {active && <Text style={styles.check}>✓</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.studentName}>{s.name}</Text>
                          <Text style={styles.studentClass}>
                            {s.class ?? '—'}
                            {s.school ? ` · ${s.school.name}` : ''}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>Adres</Text>
              <Text style={styles.stepSub}>Servisçilerin öğrenciyi alacağı adres</Text>

              <Pressable
                onPress={autoFillLocation}
                disabled={locLoading}
                style={({ pressed }) => [
                  styles.locBtn,
                  (locLoading || pressed) && { opacity: 0.7 },
                  coords && styles.locBtnDone,
                ]}
              >
                <Text style={styles.locBtnEmoji}>{coords ? '✓' : '📍'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locBtnLabel}>
                    {locLoading ? 'Konum alınıyor...' : coords ? 'Konum kaydedildi' : 'Konumumu Otomatik Doldur'}
                  </Text>
                  <Text style={styles.locBtnSub}>
                    {coords
                      ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} · Alanlar doldu`
                      : 'İl/ilçe/mahalle otomatik dolar, sonra düzenleyebilirsin'}
                  </Text>
                </View>
              </Pressable>

              {enabledCities.length > 0 ? (
                <View style={styles.cityBlock}>
                  <Text style={styles.cityLabel}>İl</Text>
                  <View style={styles.cityChips}>
                    {enabledCities.map((c) => {
                      const active = city === c;
                      return (
                        <Pressable
                          key={c}
                          onPress={() => setCity(c)}
                          style={[styles.cityChip, active && styles.cityChipActive]}
                        >
                          <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>{c}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {city && !enabledCities.includes(city) && (
                    <Text style={styles.cityHint}>
                      Şu an "{city}" için hizmet vermiyoruz. Yukarıdan aktif illerden birini seç.
                    </Text>
                  )}
                </View>
              ) : (
                <Input label="İl" value={city} onChangeText={setCity} placeholder="Ordu" autoCapitalize="words" />
              )}
              <Input label="İlçe" value={district} onChangeText={setDistrict} placeholder="Altınordu" autoCapitalize="words" />
              <Input label="Mahalle" value={neighborhood} onChangeText={setNeighborhood} placeholder="Karadeniz" autoCapitalize="words" />
              <Input
                label="Tam Adres"
                value={address}
                onChangeText={setAddress}
                placeholder="Cadde, sokak, bina no, daire no..."
                multiline
                numberOfLines={4}
                style={{ minHeight: 100, textAlignVertical: 'top' }}
                hint="Servisçi öğrenciyi burdan alır"
              />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>Servis Tercihi</Text>
              <Text style={styles.stepSub}>Hangi tip servisi istiyorsun?</Text>

              <View style={styles.pickupList}>
                <PickupOption
                  label="Gidiş + Dönüş"
                  desc="Okula gidiş ve dönüş"
                  active={pickupType === 'both'}
                  onPress={() => setPickupType('both')}
                />
                <PickupOption
                  label="Sadece Sabah"
                  desc="Sadece okula gidiş"
                  active={pickupType === 'morning_only'}
                  onPress={() => setPickupType('morning_only')}
                />
                <PickupOption
                  label="Sadece Öğleden Sonra"
                  desc="Sadece okuldan dönüş"
                  active={pickupType === 'afternoon_only'}
                  onPress={() => setPickupType('afternoon_only')}
                />
              </View>

              <Input
                label="Ek Notlar (opsiyonel)"
                value={notes}
                onChangeText={setNotes}
                placeholder="Ör: Servisçinin bilmesi gereken sağlık durumu, alerji, öğle molası vs."
                multiline
                numberOfLines={4}
                style={{ minHeight: 90, textAlignVertical: 'top' }}
              />
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.stepTitle}>Onay</Text>
              <Text style={styles.stepSub}>Talebi göndermeden önce kontrol et</Text>

              <SummaryCard label="Öğrenci">
                {selectedStudents.map((s) => (
                  <View key={s.id} style={styles.sumRow}>
                    <Text style={styles.sumBold}>{s.name}</Text>
                    <Text style={styles.sumMuted}>
                      {s.class ?? '—'}
                      {s.school ? ` · ${s.school.name}` : ''}
                    </Text>
                  </View>
                ))}
              </SummaryCard>

              <SummaryCard label="Adres">
                <Text style={styles.sumBold}>{city} · {district} · {neighborhood}</Text>
                <Text style={styles.sumMuted}>{address}</Text>
              </SummaryCard>

              <SummaryCard label="Servis Tercihi">
                <Text style={styles.sumBold}>{pickupLabel(pickupType)}</Text>
                {notes && <Text style={styles.sumMuted}>Not: {notes}</Text>}
              </SummaryCard>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Talebin, bölgende çalışan tüm servisçilere bildirim olarak gider. Teklifler geldiğinde uygulamandan bildirim alırsın.
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step < STEPS.length - 1 ? (
            <Button
              label="Devam"
              onPress={() => setStep(step + 1)}
              disabled={!canProceed()}
            />
          ) : (
            <Button
              label={loading ? 'Gönderiliyor...' : 'Talebi Gönder'}
              onPress={submit}
              loading={loading}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function pickupLabel(t: PickupType): string {
  return t === 'both' ? 'Gidiş + Dönüş' : t === 'morning_only' ? 'Sadece Sabah' : 'Sadece Öğleden Sonra';
}

function PickupOption({ label, desc, active, onPress }: { label: string; desc: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pickupCard, active && styles.pickupCardActive]}>
      <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
        {active && <View style={styles.radioInner} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.pickupLabel}>{label}</Text>
        <Text style={styles.pickupDesc}>{desc}</Text>
      </View>
    </Pressable>
  );
}

function SummaryCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.sumCard}>
      <Text style={styles.sumLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingBottom: 20 },
  heroInner: { paddingHorizontal: 20, paddingTop: 8 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  back: { padding: 6, width: 32 },
  backText: { fontSize: 24, color: colors.dark },
  heroLogo: { width: 130, height: 56 },
  stepBar: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  stepWrap: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1.5, borderColor: 'rgba(31,41,55,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  stepNum: { fontSize: 11, fontWeight: '800', color: colors.dark },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 10, color: 'rgba(31,41,55,0.6)', fontWeight: '600' },
  stepLabelActive: { color: colors.dark, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 20, gap: 6 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  stepSub: { fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 16 },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.blueSoft,
    borderWidth: 1,
    borderColor: '#93C5FD',
    marginBottom: 12,
  },
  locBtnDone: {
    backgroundColor: colors.successSoft,
    borderColor: '#A7F3D0',
  },
  locBtnEmoji: { fontSize: 22 },
  locBtnLabel: { fontSize: 13, fontWeight: '800', color: colors.dark },
  locBtnSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  cityBlock: { marginBottom: 12 },
  cityLabel: {
    fontSize: 11, fontWeight: '800', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  cityChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cityChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  cityChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  cityChipText: { fontSize: 13, fontWeight: '700', color: colors.dark },
  cityChipTextActive: { color: colors.dark },
  cityHint: { fontSize: 11, color: '#B91C1C', marginTop: 8, fontWeight: '600' },
  emptyBox: {
    padding: 24, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, marginTop: 6, textAlign: 'center' },
  studentList: { gap: 8 },
  studentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  studentCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  checkBox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  check: { color: '#fff', fontWeight: '800', fontSize: 14 },
  studentName: { fontSize: 14, fontWeight: '800', color: colors.dark },
  studentClass: { fontSize: 11, color: colors.muted, marginTop: 2 },
  pickupList: { gap: 8, marginBottom: 8 },
  pickupCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  pickupCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: colors.dark },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.dark },
  pickupLabel: { fontSize: 14, fontWeight: '700', color: colors.dark },
  pickupDesc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  sumCard: {
    padding: 14, backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8,
  },
  sumLabel: {
    fontSize: 10, fontWeight: '800', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  sumRow: { paddingVertical: 3 },
  sumBold: { fontSize: 13, fontWeight: '700', color: colors.dark },
  sumMuted: { fontSize: 11, color: colors.muted, marginTop: 2 },
  infoBox: {
    padding: 12, backgroundColor: colors.primarySoft, borderRadius: 10,
    borderWidth: 1, borderColor: colors.primary + '40',
    marginTop: 4,
  },
  infoText: { fontSize: 11, color: '#78350F', fontWeight: '600', lineHeight: 17 },
  footer: {
    padding: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: '#fff',
  },
});
