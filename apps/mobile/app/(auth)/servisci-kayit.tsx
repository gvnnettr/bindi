import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api, ApiError } from '../../src/api/client';
import { useAuth } from '../../src/state/auth';
import { Button, ErrorBanner, Input } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

interface RegisterResp {
  token: string;
  role: 'provider';
  userId: string;
  name: string;
  status: string;
}

const STEPS = ['Firma', 'Şifre'];

/**
 * Servisçi kayıt formu — OTP doğrulandıktan sonra çağrılır.
 * 2 adım: firma bilgileri + PIN. Belgeler admin onayından sonra ayrıca yüklenir.
 * Kayıt sonrası: status='pending_approval' → onay bekleniyor ekranı.
 */
export default function ServisciKayitScreen() {
  const params = useLocalSearchParams<{ phone: string; verificationToken: string }>();
  const { setSession } = useAuth();
  const [step, setStep] = useState(0);

  // Adım 1 — Firma
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [taxNo, setTaxNo] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Adım 2 — Şifre
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function next() {
    setError(null);
    if (step === 0) {
      if (!companyName.trim()) { setError('Şirket adını gir'); return; }
      if (!ownerName.trim()) { setError('Şirket sahibinin adını gir'); return; }
      setStep(1);
    }
  }

  async function submit() {
    if (password.length !== 6) { setError('6 rakamlı PIN belirle'); return; }
    if (password !== passwordAgain) { setError('PIN\'ler eşleşmiyor'); return; }

    setLoading(true);
    setError(null);
    try {
      const resp = await api.post<RegisterResp>('/auth/register/provider', {
        phone: params.phone,
        verificationToken: params.verificationToken,
        companyName: companyName.trim(),
        ownerName: ownerName.trim(),
        taxNo: taxNo.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        password,
      });
      await setSession('provider', resp.token);
      router.replace('/(auth)/servisci-onay-bekleniyor');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <LinearGradient
          colors={['#93C5FD', '#3B82F6', '#1E40AF']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.3, y: 0.25 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <Pressable
              onPress={() => (step === 0 ? router.back() : setStep(step - 1))}
              style={styles.back}
              hitSlop={12}
            >
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeIcon}>🚐</Text>
              <Text style={styles.roleBadgeText}>YENİ SERVİSÇİ KAYDI</Text>
            </View>
            <Image
              source={require('../../assets/bindi-logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <View style={styles.stepBar}>
              {STEPS.map((s, i) => (
                <View key={i} style={styles.stepItem}>
                  <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                    <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
                </View>
              ))}
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.formArea} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />

          <Text style={styles.phoneRow}>
            📱 <Text style={styles.phoneText}>+90 {params.phone.replace(/^0/, '')}</Text>
          </Text>

          {step === 0 && (
            <>
              <Input
                label="Şirket Adı *"
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Örn: Yıldız Servis Ltd."
                autoFocus
              />
              <Input
                label="Şirket Sahibinin Adı *"
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Örn: Ali Yıldız"
              />
              <Input
                label="Vergi No"
                value={taxNo}
                onChangeText={setTaxNo}
                placeholder="10 haneli"
                keyboardType="number-pad"
                maxLength={10}
              />
              <Input
                label="E-posta"
                value={email}
                onChangeText={setEmail}
                placeholder="firma@mail.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Firma Adresi"
                value={address}
                onChangeText={setAddress}
                placeholder="Örn: Altınordu, Ordu"
              />

              <Button
                label="Devam →"
                onPress={next}
                style={{ marginTop: 16 }}
              />
            </>
          )}

          {step === 1 && (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text style={styles.infoText}>
                  Kayıt sonrası ekibimiz belgelerinizi ({'\n'}K1, ehliyet, ruhsat vs.) inceleyecek.
                  Onay 24 saat içinde tamamlanır.
                </Text>
              </View>

              <Input
                label="6 Rakam PIN"
                value={password}
                onChangeText={(v) => setPassword(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <Input
                label="PIN Tekrar"
                value={passwordAgain}
                onChangeText={(v) => setPasswordAgain(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
              />

              <Button
                label={loading ? 'Kayıt oluyor...' : 'Hesabı Oluştur'}
                onPress={submit}
                disabled={loading}
                style={{ marginTop: 16 }}
              />

              <Text style={styles.legal}>
                Devam ederek <Text style={styles.legalBold}>KVKK aydınlatma metni</Text> ve{' '}
                <Text style={styles.legalBold}>servisçi sözleşmesi</Text>ni kabul etmiş olursun.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingBottom: 24 },
  heroInner: {
    padding: 20,
    paddingTop: 8,
    alignItems: 'center',
    gap: 10,
  },
  back: { alignSelf: 'flex-start', padding: 4 },
  backText: { fontSize: 24, color: '#fff', fontWeight: '600' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeIcon: { fontSize: 14 },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  heroLogo: { width: 160, height: 84, marginTop: 2 },
  stepBar: { flexDirection: 'row', gap: 20, marginTop: 4 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: { backgroundColor: '#fff' },
  stepNum: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.75)' },
  stepNumActive: { color: '#1E40AF' },
  stepLabel: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  stepLabelActive: { color: '#fff' },
  formArea: {
    padding: 24,
    paddingTop: 20,
    flexGrow: 1,
    backgroundColor: colors.card,
  },
  phoneRow: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  phoneText: { fontWeight: '700', color: colors.dark, fontSize: 14 },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.blueSoft,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  infoIcon: { fontSize: 20 },
  infoText: { flex: 1, fontSize: 12, color: colors.dark, lineHeight: 18 },
  legal: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 20,
    lineHeight: 17,
    textAlign: 'center',
  },
  legalBold: { fontWeight: '700', color: colors.dark },
});
