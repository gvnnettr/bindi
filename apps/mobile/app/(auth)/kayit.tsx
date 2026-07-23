import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
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
  role: 'parent';
  userId: string;
  name: string;
}

/**
 * Veli kayıt formu — OTP doğrulandıktan sonra çağrılır.
 * verificationToken params'tan gelir, backend'e /auth/register/parent atılır.
 */
export default function VeliKayitScreen() {
  const params = useLocalSearchParams<{ phone: string; verificationToken: string }>();
  const { setSession } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim()) { setError('Ad soyad gir'); return; }
    if (password.length !== 6) { setError('6 rakamlı şifre gir'); return; }
    if (password !== passwordAgain) { setError('Şifreler eşleşmiyor'); return; }

    setLoading(true);
    setError(null);
    try {
      const resp = await api.post<RegisterResp>('/auth/register/parent', {
        phone: params.phone,
        verificationToken: params.verificationToken,
        name: name.trim(),
        email: email.trim() || undefined,
        password,
      });
      await setSession('parent', resp.token);
      router.replace('/(app)/veli');
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
          colors={['#FFE28A', colors.primary, '#E1A800']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.3, y: 0.25 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeIcon}>👨‍👩‍👧</Text>
              <Text style={styles.roleBadgeText}>YENİ VELİ KAYDI</Text>
            </View>
            <Image
              source={require('../../assets/bindi-logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <Text style={styles.heroTitle}>Son adım!</Text>
            <Text style={styles.heroSub}>
              Kendini kısa tanıt ve şifre belirle, hesabın hazır.
            </Text>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.formArea} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />

          <Text style={styles.phoneRow}>
            📱 <Text style={styles.phoneText}>+90 {params.phone.replace(/^0/, '')}</Text>
          </Text>

          <Input
            label="Ad Soyad"
            value={name}
            onChangeText={setName}
            placeholder="Örn: Ayşe Yıldız"
            autoFocus
          />

          <Input
            label="E-posta (opsiyonel)"
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="6 Rakam PIN"
            value={password}
            onChangeText={(v) => setPassword(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
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
            label={loading ? 'Kayıt oluyor...' : 'Hesabı Oluştur & Giriş Yap'}
            onPress={submit}
            disabled={loading}
            style={{ marginTop: 16 }}
          />

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
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingBottom: 28 },
  heroInner: {
    padding: 20,
    paddingTop: 8,
    alignItems: 'center',
    gap: 10,
  },
  back: { alignSelf: 'flex-start', padding: 4 },
  backText: { fontSize: 24, color: colors.dark, fontWeight: '600' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(31,41,55,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeIcon: { fontSize: 14 },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: 1,
  },
  heroLogo: { width: 180, height: 96, marginTop: 2 },
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
    paddingHorizontal: 20,
  },
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
  legal: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 24,
    lineHeight: 17,
    textAlign: 'center',
  },
  legalBold: { fontWeight: '700', color: colors.dark },
});
