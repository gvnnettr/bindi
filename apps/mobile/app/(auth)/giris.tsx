import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api, ApiError } from '../../src/api/client';
import { useAuth, type Role } from '../../src/state/auth';
import { Input, ErrorBanner } from '../../src/components/ui';
import { PhoneField } from '../../src/components/PhoneField';
import { colors } from '../../src/theme/colors';

interface ProviderLoginResp {
  token: string;
  providerId: string;
  mustChangePassword?: boolean;
}
interface ParentLoginResp {
  token: string;
  parentId: string;
  name: string;
}
interface ParentCheckResp {
  exists: boolean;
  hasPassword: boolean;
}

export default function GirisScreen() {
  const { role } = useLocalSearchParams<{ role: Role }>();
  const { setSession } = useAuth();
  const isProvider = role === 'provider';

  // Sadece 10 hane (5054453212 gibi)
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parentNeedsOtp, setParentNeedsOtp] = useState(false);

  // Backend'e 0'la başlayan 11 hane formatında yolla (05054453212)
  const backendPhone = phone.length === 10 ? '0' + phone : phone;

  async function submit() {
    if (phone.length !== 10) {
      setError('10 haneli telefon numaranı gir');
      return;
    }
    if (password.length !== 6) {
      setError('6 rakamlı şifreni gir');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (isProvider) {
        const resp = await api.post<ProviderLoginResp>('/providers/login', {
          phone: backendPhone,
          password,
        });
        await setSession('provider', resp.token);
        if (resp.mustChangePassword) {
          router.replace('/(auth)/sifre-belirle');
        } else {
          router.replace('/(app)/servisci');
        }
      } else {
        const check = await api.post<ParentCheckResp>('/parents/login/check', {
          phone: backendPhone,
        });
        if (!check.exists) {
          setError('Bu numara kayıtlı değil. Önce web sitesinden teklif talep etmen gerekir.');
          setLoading(false);
          return;
        }
        if (check.hasPassword) {
          const resp = await api.post<ParentLoginResp>('/parents/login/password', {
            phone: backendPhone,
            password,
          });
          await setSession('parent', resp.token);
          router.replace('/(app)/veli');
        } else {
          // Şifresi yok → tek seferlik SMS ile şifre belirletme akışı
          setParentNeedsOtp(true);
          router.push({ pathname: '/(auth)/otp', params: { phone: backendPhone, role: 'parent', mode: 'existing' } });
        }
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

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
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
              <Text style={[styles.backText, isProvider && { color: '#fff' }]}>←</Text>
            </Pressable>
            <View style={[styles.roleBadge, isProvider && styles.roleBadgeProvider]}>
              <Text style={styles.roleBadgeIcon}>{isProvider ? '🚐' : '👨‍👩‍👧'}</Text>
              <Text style={[styles.roleBadgeText, isProvider && { color: '#fff' }]}>
                {isProvider ? 'SERVİSÇİ GİRİŞİ' : 'VELİ GİRİŞİ'}
              </Text>
            </View>
            <Image
              source={require('../../assets/bindi-logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <Text style={[styles.heroTitle, isProvider && { color: '#fff' }]}>
              {isProvider ? 'Servisçi Paneli' : 'Hoş geldin'}
            </Text>
            <Text style={[styles.heroSub, isProvider && { color: 'rgba(255,255,255,0.85)' }]}>
              {isProvider
                ? 'Taleplere teklif vermek için giriş yap'
                : 'Servis teklifleri için giriş yap'}
            </Text>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.formArea} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />

          <PhoneField
            label="Telefon Numarası"
            value={phone}
            onChangeText={setPhone}
            hint={phone.length > 0 && phone.length < 10 ? `${phone.length}/10 hane` : undefined}
            autoFocus
          />

          <Input
            label="Şifre (6 rakam)"
            value={password}
            onChangeText={(v) => setPassword(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            hint={password.length > 0 && password.length < 6 ? `${password.length}/6 rakam` : undefined}
          />

          <Pressable
            onPress={submit}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryCta,
              (loading || pressed) && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.primaryCtaText}>Giriş Yap</Text>
            <Text style={styles.primaryCtaArrow}>→</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(auth)/sifremi-unuttum',
                params: { role: isProvider ? 'provider' : 'parent' },
              })
            }
            style={styles.forgot}
            hitSlop={8}
          >
            <Text style={styles.forgotText}>Şifremi unuttum</Text>
          </Pressable>

          <Text style={styles.legal}>
            Devam ederek <Text style={styles.legalBold}>KVKK aydınlatma metni</Text> ve{' '}
            <Text style={styles.legalBold}>kullanım koşulları</Text>nı kabul etmiş olursun.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  hero: {
    paddingBottom: 32,
  },
  heroInner: {
    paddingHorizontal: 24,
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
  roleBadgeProvider: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  roleBadgeIcon: { fontSize: 14 },
  roleBadgeText: {
    fontSize: 11,
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
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(31,41,55,0.75)',
    fontWeight: '500',
    textAlign: 'center',
  },
  formArea: {
    padding: 24,
    paddingTop: 28,
    flexGrow: 1,
    backgroundColor: colors.card,
  },
  primaryCta: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryCtaText: {
    color: colors.dark,
    fontWeight: '800',
    fontSize: 15,
  },
  primaryCtaArrow: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: '800',
  },
  forgot: { alignSelf: 'center', marginTop: 18 },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark,
    textDecorationLine: 'underline',
  },
  legal: {
    marginTop: 'auto',
    paddingTop: 24,
    textAlign: 'center',
    fontSize: 11,
    color: colors.muted,
    lineHeight: 18,
  },
  legalBold: {
    color: colors.dark,
    fontWeight: '700',
  },
});
