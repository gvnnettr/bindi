import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { api, ApiError } from '../../src/api/client';
import { useAuth, type Role } from '../../src/state/auth';
import { Button, ErrorBanner } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

/**
 * Yeni unified OTP flow
 * mode='set-password': mevcut hesap, OTP doğrula + şifre belirle → giriş
 * mode='register':     yeni kayıt, OTP doğrula → kayıt formuna yönlen
 */
type Mode = 'set-password' | 'register';

interface OtpVerifyResp {
  verificationToken: string;
}
interface SetPasswordResp {
  token: string;
  role: Role;
  userId: string;
  name: string;
  status?: string;
}

export default function OtpScreen() {
  const params = useLocalSearchParams<{
    phone: string;
    role: Role;
    mode: Mode;
  }>();
  const { setSession } = useAuth();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isProvider = params.role === 'provider';
  const isSetPassword = params.mode === 'set-password';

  useEffect(() => {
    startCooldown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown() {
    setSecondsLeft(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function resendCode() {
    if (secondsLeft > 0) return;
    setError(null);
    try {
      await api.post('/auth/otp/send', {
        phone: params.phone,
        role: params.role,
      });
      startCooldown();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }

  async function submit() {
    if (!/^\d{6}$/.test(code)) {
      setError('6 haneli kodu gir');
      return;
    }
    if (isSetPassword && !/^\d{6}$/.test(newPassword)) {
      setError('6 rakamlı yeni şifre belirle');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1) OTP verify → verificationToken al
      const verified = await api.post<OtpVerifyResp>('/auth/otp/verify', {
        phone: params.phone,
        role: params.role,
        code,
      });

      if (isSetPassword) {
        // 2a) Şifre belirle → oto-login
        const resp = await api.post<SetPasswordResp>('/auth/set-password', {
          phone: params.phone,
          role: params.role,
          verificationToken: verified.verificationToken,
          password: newPassword,
        });
        await setSession(resp.role, resp.token);
        if (resp.role === 'provider' && resp.status === 'pending_approval') {
          router.replace('/(auth)/servisci-onay-bekleniyor');
        } else {
          router.replace(resp.role === 'provider' ? '/(app)/servisci' : '/(app)/veli');
        }
      } else {
        // 2b) Kayıt formuna yönlen (verify token'ı params ile gönder)
        router.replace({
          pathname: isProvider
            ? '/(auth)/servisci-kayit'
            : '/(auth)/kayit',
          params: {
            phone: params.phone,
            verificationToken: verified.verificationToken,
          },
        });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const title = isSetPassword ? 'Kod ile şifre belirle' : 'Doğrulama kodu';
  const cta = isSetPassword ? 'Şifreyi Kaydet & Giriş' : 'Doğrula & Devam Et';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.iconBadge}>
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#78350F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Rect x="2" y="4" width="20" height="16" rx="2" />
              <Path d="m22 7-10 5L2 7" />
            </Svg>
          </View>

          <Text style={styles.title}>Kod gönderildi</Text>
          <Text style={styles.sub}>
            <Text style={styles.phone}>{params.phone}</Text>{'\n'}
            numarasına 6 haneli SMS kod gönderildi.
          </Text>

          <View style={styles.errorWrap}>
            <ErrorBanner message={error} />
          </View>

          <CodeBoxes value={code} onChange={setCode} />

          {isSetPassword && (
            <View style={styles.pinBox}>
              <Text style={styles.pinLabel}>Yeni 6 rakamlı şifre</Text>
              <PinBoxes value={newPassword} onChange={setNewPassword} />
              <Text style={styles.pinHint}>Bu şifreyle sonraki girişlerinde hemen içeri girersin.</Text>
            </View>
          )}

          <Button
            label={loading ? 'Doğrulanıyor...' : cta}
            onPress={submit}
            disabled={loading || code.length !== 6 || (isSetPassword && newPassword.length !== 6)}
            style={{ marginTop: 16 }}
          />

          <View style={styles.resend}>
            {secondsLeft > 0 ? (
              <Text style={styles.resendText}>Yeni kod için {secondsLeft}s bekle</Text>
            ) : (
              <Pressable onPress={resendCode} hitSlop={8}>
                <Text style={styles.resendLink}>Kodu tekrar gönder</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CodeBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<TextInput>(null);
  const boxes = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={{ alignSelf: 'stretch' }}>
      <View style={styles.codeRow}>
        {boxes.map((c, i) => (
          <View key={i} style={[styles.codeBox, c && styles.codeBoxFilled]}>
            <Text style={styles.codeText}>{c}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />
    </Pressable>
  );
}

function PinBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<TextInput>(null);
  const boxes = Array.from({ length: 6 }, (_, i) => (value[i] ? '•' : ''));
  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={{ alignSelf: 'stretch' }}>
      <View style={styles.codeRow}>
        {boxes.map((c, i) => (
          <View key={i} style={[styles.codeBox, c && styles.codeBoxFilled]}>
            <Text style={styles.codeText}>{c}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        secureTextEntry
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  back: { padding: 4 },
  backText: { fontSize: 24, color: colors.dark },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.dark },
  body: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.dark, marginBottom: 6 },
  sub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  phone: { color: colors.dark, fontWeight: '700' },
  errorWrap: { alignSelf: 'stretch', marginTop: 16 },
  codeRow: { flexDirection: 'row', gap: 8, marginTop: 16, justifyContent: 'center' },
  codeBox: {
    width: 44,
    height: 54,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  codeBoxFilled: { borderColor: colors.primaryDark, backgroundColor: colors.primarySoft },
  codeText: { fontSize: 22, fontWeight: '800', color: colors.dark },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  pinBox: { marginTop: 24, alignSelf: 'stretch' },
  pinLabel: { fontSize: 13, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  pinHint: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 8 },
  resend: { marginTop: 20 },
  resendText: { fontSize: 12, color: colors.muted },
  resendLink: { fontSize: 13, color: colors.blue, fontWeight: '700' },
});
