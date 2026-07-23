import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../src/api/client';
import { useAuth } from '../../src/state/auth';
import { Button, ErrorBanner, Input } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

interface ProviderLoginResp {
  token: string;
  providerId: string;
  mustChangePassword?: boolean;
}

export default function SifreBelirle() {
  const params = useLocalSearchParams<{
    phone?: string;
    code?: string;
    flow?: 'reset' | 'first-login';
  }>();
  const { token, setSession, logout } = useAuth();
  const flow = params.flow ?? 'first-login';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!/^\d{6}$/.test(password)) {
      setError('Şifre 6 rakamdan oluşmalı');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (flow === 'reset') {
        if (!params.phone || !params.code) {
          setError('SMS akışı hatalı, baştan başlayın');
          setLoading(false);
          return;
        }
        await api.post('/providers/reset-password', {
          phone: params.phone,
          code: params.code,
          newPassword: password,
        });
        // Şifre değişti — otomatik giriş yap
        const resp = await api.post<ProviderLoginResp>('/providers/login', {
          phone: params.phone,
          password,
        });
        await setSession('provider', resp.token);
        router.replace('/(app)/servisci');
      } else {
        // First-login: mevcut token ile şifre değiştir
        if (!token) {
          setError('Oturum yok, tekrar giriş yap');
          setLoading(false);
          return;
        }
        await api.post('/me/password', { newPassword: password }, token);
        router.replace('/(app)/servisci');
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {flow !== 'first-login' && (
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
          )}

          <Text style={styles.title}>
            {flow === 'reset' ? 'Yeni Şifreni Belirle' : 'Şifreni Değiştir'}
          </Text>
          <Text style={styles.sub}>
            {flow === 'reset'
              ? 'Bundan sonra bu şifre ile giriş yapacaksın.'
              : 'İlk girişten sonra güvenlik için şifreni değiştirmelisin.'}
          </Text>

          <View style={{ marginTop: 24 }}>
            <ErrorBanner message={error} />
            <Input
              label="Yeni Şifre (6 rakam)"
              value={password}
              onChangeText={(v) => setPassword(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="password-new"
              autoFocus
              hint={password.length > 0 && password.length < 6 ? `${password.length}/6 rakam` : undefined}
            />
            <Input
              label="Şifre Tekrar"
              value={confirm}
              onChangeText={(v) => setConfirm(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="password-new"
            />
            <Button
              label={flow === 'reset' ? 'Şifreyi Belirle' : 'Devam'}
              onPress={submit}
              loading={loading}
              disabled={!password || !confirm}
              style={{ marginTop: 12 }}
            />

            {flow === 'first-login' && (
              <Button
                label="Çıkış Yap"
                variant="ghost"
                style={{ marginTop: 12 }}
                onPress={async () => {
                  await logout();
                  router.replace('/');
                }}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, flexGrow: 1 },
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
