import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api, ApiError } from '../../src/api/client';
import { useAuth, type Role } from '../../src/state/auth';
import { ErrorBanner } from '../../src/components/ui';
import { PhoneField } from '../../src/components/PhoneField';
import { colors } from '../../src/theme/colors';
import {
  authenticate,
  clearCredentials,
  isBiometricEnabled,
  isBiometricSupported,
  loadCredentials,
  saveCredentials,
} from '../../src/lib/biometric';

interface PhoneCheckResp {
  status: 'has_password' | 'needs_password' | 'needs_registration';
}
interface LoginResp {
  token: string;
  role: Role;
  userId: string;
  name: string;
  status?: string;
  mustChangePassword?: boolean;
}

/**
 * Phone-first auth (Sprint 7)
 * Adım 1: Telefon numarası → backend hangi ekrana yönlendireceğini söyler
 * Adım 2: Duruma göre şifre / OTP+şifre-belirle / kayıt formu
 */
export default function GirisScreen() {
  const { role } = useLocalSearchParams<{ role: Role }>();
  const { setSession } = useAuth();
  const isProvider = role === 'provider';

  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState<'phone' | 'password'>('phone');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [savedForBiometric, setSavedForBiometric] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const backendPhone = phone.length === 10 ? '0' + phone : phone;

  // Cihazda biyometrik varsa ve önceden kayıt yapıldıysa hemen prompt
  useEffect(() => {
    (async () => {
      const supported = await isBiometricSupported();
      setBiometricAvailable(supported);
      const enabled = await isBiometricEnabled();
      if (!supported || !enabled) return;
      const saved = await loadCredentials();
      if (!saved) return;
      if (isProvider !== (saved.role === 'provider')) return;
      setSavedForBiometric(true);
    })();
  }, [isProvider]);

  async function tryBiometricLogin() {
    const saved = await loadCredentials();
    if (!saved) return;
    const ok = await authenticate('Bindi\'ye giriş yap');
    if (!ok) return;
    // Auto-fill + submit
    const phoneWithoutZero = saved.phone.startsWith('0') ? saved.phone.slice(1) : saved.phone;
    setPhone(phoneWithoutZero);
    setPassword(saved.password);
    setLoading(true);
    setError(null);
    try {
      const url = isProvider ? '/providers/login' : '/parents/login/password';
      const resp = await api.post<LoginResp>(url, {
        phone: saved.phone,
        password: saved.password,
      });
      await setSession(isProvider ? 'provider' : 'parent', resp.token);
      if (isProvider && (resp as any).status === 'pending_approval') {
        router.replace('/(auth)/servisci-onay-bekleniyor');
      } else {
        router.replace(isProvider ? '/(app)/servisci' : '/(app)/veli');
      }
    } catch (e) {
      setError('Kayıtlı giriş başarısız. Şifreni yeniden gir.');
      await clearCredentials();
      setSavedForBiometric(false);
    } finally {
      setLoading(false);
    }
  }

  async function submitPhone() {
    if (phone.length !== 10) {
      setError('10 haneli telefon numaranı gir');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const check = await api.post<PhoneCheckResp>('/auth/phone-check', {
        phone: backendPhone,
        role: isProvider ? 'provider' : 'parent',
      });

      if (check.status === 'has_password') {
        // Kayıtlı + şifreli → şifre input aç
        setStage('password');
      } else if (check.status === 'needs_password') {
        // Kayıtlı ama şifresiz → OTP gönder, şifre belirle akışına
        await api.post('/auth/otp/send', {
          phone: backendPhone,
          role: isProvider ? 'provider' : 'parent',
        });
        router.push({
          pathname: '/(auth)/otp',
          params: {
            phone: backendPhone,
            role: isProvider ? 'provider' : 'parent',
            mode: 'set-password',
          },
        });
      } else {
        // Hiç kayıtsız → OTP gönder, sonra kayıt formu
        await api.post('/auth/otp/send', {
          phone: backendPhone,
          role: isProvider ? 'provider' : 'parent',
        });
        router.push({
          pathname: '/(auth)/otp',
          params: {
            phone: backendPhone,
            role: isProvider ? 'provider' : 'parent',
            mode: 'register',
          },
        });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword() {
    if (password.length !== 6) {
      setError('6 rakamlı şifreni gir');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = isProvider ? '/providers/login' : '/parents/login/password';
      const resp = await api.post<LoginResp>(url, {
        phone: backendPhone,
        password,
      });
      await setSession(isProvider ? 'provider' : 'parent', resp.token);

      // "Beni hatırla" işaretliyse ve cihaz destekliyorsa credentials sakla
      if (rememberMe && biometricAvailable) {
        try {
          await saveCredentials({
            phone: backendPhone,
            password,
            role: isProvider ? 'provider' : 'parent',
          });
        } catch {}
      }

      if (isProvider && resp.mustChangePassword) {
        router.replace('/(auth)/sifre-belirle');
      } else if (isProvider && (resp as any).status === 'pending_approval') {
        router.replace('/(auth)/servisci-onay-bekleniyor');
      } else {
        router.replace(isProvider ? '/(app)/servisci' : '/(app)/veli');
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function editPhone() {
    setStage('phone');
    setPassword('');
    setError(null);
  }

  const heroTitle =
    stage === 'phone'
      ? isProvider
        ? 'Servisçi Girişi'
        : 'Hoş geldin'
      : 'Şifreni gir';

  const heroSub =
    stage === 'phone'
      ? 'Telefon numaranla başla — hesabın varsa hemen giriyoruz'
      : `+90 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 8)} ${phone.slice(8, 10)} numarasına ait şifre`;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <LinearGradient
          colors={
            isProvider
              ? ['#93C5FD', '#3B82F6', '#1E40AF']
              : ['#FFE28A', colors.primary, '#E1A800']
          }
          locations={[0, 0.5, 1]}
          start={{ x: 0.3, y: 0.25 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <Pressable
              onPress={() => (stage === 'phone' ? router.back() : editPhone())}
              style={styles.back}
              hitSlop={12}
            >
              <Text style={[styles.backText, isProvider && { color: '#fff' }]}>←</Text>
            </Pressable>
            <View style={[styles.roleBadge, isProvider && styles.roleBadgeProvider]}>
              <Text style={styles.roleBadgeIcon}>{isProvider ? '🚐' : '👨‍👩‍👧'}</Text>
              <Text style={[styles.roleBadgeText, isProvider && { color: '#fff' }]}>
                {isProvider ? 'SERVİSÇİ' : 'VELİ'}
              </Text>
            </View>
            <Image
              source={require('../../assets/bindi-logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <Text style={[styles.heroTitle, isProvider && { color: '#fff' }]}>{heroTitle}</Text>
            <Text style={[styles.heroSub, isProvider && { color: 'rgba(255,255,255,0.85)' }]}>
              {heroSub}
            </Text>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.formArea} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />

          {stage === 'phone' && (
            <>
              <PhoneField
                label="Telefon Numarası"
                value={phone}
                onChangeText={setPhone}
                hint={phone.length > 0 && phone.length < 10 ? `${phone.length}/10 hane` : undefined}
                autoFocus
              />

              <Pressable
                onPress={submitPhone}
                disabled={loading || phone.length !== 10}
                style={({ pressed }) => [
                  styles.primaryCta,
                  (loading || pressed) && { opacity: 0.85 },
                  phone.length !== 10 && { opacity: 0.4 },
                ]}
              >
                <Text style={styles.primaryCtaText}>Devam</Text>
                <Text style={styles.primaryCtaArrow}>→</Text>
              </Pressable>

              {savedForBiometric && (
                <Pressable
                  onPress={tryBiometricLogin}
                  disabled={loading}
                  style={({ pressed }) => [styles.biometricBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.biometricEmoji}>🔐</Text>
                  <Text style={styles.biometricText}>Face ID ile Hızlı Giriş</Text>
                </Pressable>
              )}

              <Text style={styles.legal}>
                Devam ederek <Text style={styles.legalBold}>KVKK aydınlatma metni</Text> ve{' '}
                <Text style={styles.legalBold}>kullanım koşulları</Text>nı kabul etmiş olursun.
              </Text>
            </>
          )}

          {stage === 'password' && (
            <>
              <Pressable onPress={editPhone} style={styles.editPhoneBtn}>
                <Text style={styles.editPhoneText}>
                  📱 +90 {phone.slice(0, 3)} {phone.slice(3, 6)} {phone.slice(6, 8)} {phone.slice(8, 10)}
                </Text>
                <Text style={styles.editPhoneEdit}>Değiştir</Text>
              </Pressable>

              {/* Custom şifre input — göz toggle ile */}
              <View style={styles.pwWrap}>
                <Text style={styles.pwLabel}>ŞİFRE (6 RAKAM)</Text>
                <View style={styles.pwInputRow}>
                  <TextInput
                    style={styles.pwInput}
                    value={password}
                    onChangeText={(v) => setPassword(v.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showPassword}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  <Pressable
                    onPress={() => setShowPassword((s) => !s)}
                    hitSlop={12}
                    style={styles.pwEye}
                  >
                    <Text style={styles.pwEyeText}>{showPassword ? '🙈' : '👁'}</Text>
                  </Pressable>
                </View>
                {password.length > 0 && password.length < 6 && (
                  <Text style={styles.pwHint}>{password.length}/6 rakam</Text>
                )}
              </View>

              {/* Beni hatırla + Face ID */}
              {biometricAvailable && (
                <Pressable
                  onPress={() => setRememberMe((v) => !v)}
                  style={styles.rememberRow}
                  hitSlop={8}
                >
                  <View style={[styles.checkBox, rememberMe && styles.checkBoxActive]}>
                    {rememberMe && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.rememberText}>
                    Beni hatırla — Face ID / Touch ID ile giriş
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={submitPassword}
                disabled={loading || password.length !== 6}
                style={({ pressed }) => [
                  styles.primaryCta,
                  (loading || pressed) && { opacity: 0.85 },
                  password.length !== 6 && { opacity: 0.4 },
                ]}
              >
                <Text style={styles.primaryCtaText}>Giriş Yap</Text>
                <Text style={styles.primaryCtaArrow}>→</Text>
              </Pressable>

              {savedForBiometric && (
                <Pressable
                  onPress={tryBiometricLogin}
                  disabled={loading}
                  style={({ pressed }) => [styles.biometricBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.biometricEmoji}>🔐</Text>
                  <Text style={styles.biometricText}>Face ID ile Giriş</Text>
                </Pressable>
              )}

              <Pressable
                onPress={async () => {
                  // OTP ile şifre sıfırla
                  try {
                    await api.post('/auth/otp/send', {
                      phone: backendPhone,
                      role: isProvider ? 'provider' : 'parent',
                    });
                    router.push({
                      pathname: '/(auth)/otp',
                      params: {
                        phone: backendPhone,
                        role: isProvider ? 'provider' : 'parent',
                        mode: 'set-password',
                      },
                    });
                  } catch (e) {
                    Alert.alert('Hata', (e as Error).message);
                  }
                }}
                style={styles.forgot}
                hitSlop={8}
              >
                <Text style={styles.forgotText}>Şifremi unuttum</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingBottom: 32,
  },
  heroInner: {
    padding: 20,
    paddingTop: 8,
    alignItems: 'center',
    gap: 12,
  },
  back: {
    alignSelf: 'flex-start',
    padding: 4,
  },
  backText: { fontSize: 24, color: colors.dark, fontWeight: '600' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(31,41,55,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 2,
  },
  roleBadgeProvider: { backgroundColor: 'rgba(255,255,255,0.25)' },
  roleBadgeIcon: { fontSize: 14 },
  roleBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: 1,
  },
  heroLogo: { width: 200, height: 110, marginTop: 2 },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.5,
    marginTop: 4,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(31,41,55,0.75)',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formArea: {
    padding: 24,
    paddingTop: 28,
    flexGrow: 1,
    backgroundColor: colors.card,
  },
  editPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editPhoneText: { fontSize: 15, fontWeight: '700', color: colors.dark },
  editPhoneEdit: { fontSize: 15, color: colors.blue, fontWeight: '700' },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  primaryCtaText: { fontSize: 15, fontWeight: '800', color: colors.dark },
  primaryCtaArrow: { fontSize: 18, color: colors.dark },
  forgot: { alignItems: 'center', marginTop: 20 },
  forgotText: { fontSize: 15, color: colors.blue, fontWeight: '700' },
  legal: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 24,
    lineHeight: 17,
    textAlign: 'center',
  },
  legalBold: { fontWeight: '700', color: colors.dark },

  // Custom şifre input (göz toggle)
  pwWrap: { marginBottom: 4 },
  pwLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  pwInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingRight: 4,
  },
  pwInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 22,
    color: colors.dark,
    letterSpacing: 8,
    fontWeight: '700',
  },
  pwEye: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pwEyeText: { fontSize: 22 },
  pwHint: { fontSize: 11, color: colors.muted, marginTop: 6, fontWeight: '600' },

  // Beni hatırla
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 4,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxActive: {
    borderColor: colors.dark,
    backgroundColor: colors.dark,
  },
  checkMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  rememberText: {
    fontSize: 13,
    color: colors.dark,
    fontWeight: '600',
    flex: 1,
  },

  // Face ID buton
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    marginTop: 12,
  },
  biometricEmoji: { fontSize: 22 },
  biometricText: { fontSize: 14, fontWeight: '800', color: colors.dark },
});
