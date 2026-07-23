import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../src/api/client';
import { Button, ErrorBanner } from '../../src/components/ui';
import { PhoneField } from '../../src/components/PhoneField';
import { colors } from '../../src/theme/colors';

export default function SifremiUnuttum() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const backendPhone = phone.length === 10 ? '0' + phone : phone;

  async function submit() {
    if (phone.length !== 10) {
      setError('10 haneli telefon numaranı gir');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.post('/providers/forgot-password', { phone: backendPhone });
      router.replace({
        pathname: '/(auth)/otp',
        params: { phone: backendPhone, role: 'provider', mode: 'reset' },
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.inner}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <Text style={styles.backText}>←</Text>
          </Pressable>

          <Text style={styles.title}>Şifremi Unuttum</Text>
          <Text style={styles.sub}>
            Kayıtlı telefonuna 6 haneli kod göndereceğiz. Kodu doğrulayınca yeni şifreni belirleyebilirsin.
          </Text>

          <View style={{ marginTop: 24 }}>
            <ErrorBanner message={error} />
            <PhoneField
              label="Telefon"
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
            <Button
              label="Kod Gönder"
              onPress={submit}
              loading={loading}
              disabled={phone.length !== 10}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, padding: 24 },
  back: { marginBottom: 12 },
  backText: { fontSize: 24, color: colors.dark },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.5,
  },
  sub: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
});
