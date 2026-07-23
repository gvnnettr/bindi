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
import { Button, ErrorBanner, Input } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

type Mode = 'login' | 'new' | 'existing' | 'reset';

interface ParentOtpResp {
  token: string;
  parentId: string;
  name?: string;
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
  const [sending, setSending] = useState(true);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wantsPasswordSetup = params.mode === 'new' || params.mode === 'existing';

  useEffect(() => {
    void requestCode();
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

  async function requestCode() {
    setError(null);
    setSending(true);
    try {
      if (params.role === 'provider') {
        await api.post('/providers/forgot-password', { phone: params.phone });
      } else {
        await api.post('/parents/login/request', { phone: params.phone });
      }
      startCooldown();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  async function submit() {
    if (!/^\d{6}$/.test(code)) {
      setError('6 haneli kodu gir');
      return;
    }
    if (wantsPasswordSetup && newPassword && !/^\d{6}$/.test(newPassword)) {
      setError('Şifre 6 rakamdan oluşmalı');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (params.role === 'provider') {
        router.replace({
          pathname: '/(auth)/sifre-belirle',
          params: { phone: params.phone, code, flow: 'reset' },
        });
      } else {
        const resp = await api.post<ParentOtpResp>('/parents/login/otp', {
          phone: params.phone,
          code,
          ...(wantsPasswordSetup && newPassword ? { newPassword } : {}),
        });
        await setSession('parent', resp.token);
        router.replace('/(app)/veli');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Kod Doğrulama</Text>
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

          <Text style={styles.timerText}>
            {sending
              ? 'Kod gönderiliyor...'
              : secondsLeft > 0
                ? `Kalan süre ${secondsLeft} sn`
                : 'Süre doldu — yeniden gönder'}
          </Text>

          {wantsPasswordSetup && (
            <View style={{ marginTop: 20 }}>
              <Input
                label="Yeni Şifre (6 rakam · opsiyonel)"
                value={newPassword}
                onChangeText={(v) => setNewPassword(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                hint="Bir daha SMS beklemeden şifreyle girmek istersen doldur."
              />
            </View>
          )}

          <Pressable
            onPress={submit}
            disabled={loading || code.length !== 6}
            style={({ pressed }) => [
              styles.primaryCta,
              (loading || code.length !== 6) && styles.primaryCtaDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.primaryCtaText}>
              {params.role === 'provider' ? 'Devam · Şifre Belirle' : 'Giriş Yap'}
            </Text>
            <Text style={styles.primaryCtaArrow}>→</Text>
          </Pressable>

          <Pressable
            onPress={requestCode}
            disabled={secondsLeft > 0 || sending}
            style={styles.resend}
            hitSlop={8}
          >
            <Text
              style={[
                styles.resendText,
                (secondsLeft > 0 || sending) && styles.resendDisabled,
              ]}
            >
              {secondsLeft > 0
                ? `Kodu tekrar gönder (${secondsLeft} sn)`
                : 'Kodu tekrar gönder'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CodeBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={{ width: '100%' }}>
      <View style={boxStyles.row}>
        {digits.map((d, i) => (
          <View
            key={i}
            style={[boxStyles.box, value.length === i && boxStyles.boxActive]}
          >
            <Text style={boxStyles.digit}>{d.trim()}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        style={boxStyles.hidden}
      />
    </Pressable>
  );
}

const boxStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 20,
  },
  box: {
    flex: 1,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  boxActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  digit: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.dark,
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { padding: 6, width: 32 },
  backText: { fontSize: 24, color: colors.dark },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.dark, letterSpacing: -0.2 },
  body: { padding: 24, flexGrow: 1, alignItems: 'center' },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,179,1,0.25)',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  phone: { color: colors.dark, fontWeight: '700' },
  errorWrap: { width: '100%', marginTop: 8 },
  timerText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryCta: {
    marginTop: 24,
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryCtaDisabled: {
    backgroundColor: colors.borderStrong,
    shadowOpacity: 0,
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
  resend: { marginTop: 20 },
  resendText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.blue,
    textDecorationLine: 'underline',
  },
  resendDisabled: {
    color: colors.muted,
    textDecorationLine: 'none',
  },
});
