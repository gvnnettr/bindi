import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../../src/api/client';
import { useAuth } from '../../../../src/state/auth';
import { Button, ErrorBanner, InfoBanner, Input } from '../../../../src/components/ui';
import { colors } from '../../../../src/theme/colors';

interface ParentInfo {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

export default function AyarlarScreen() {
  const { token } = useAuth();
  const [me, setMe] = useState<ParentInfo | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const m = await api.get<ParentInfo>('/me/parent', token);
      setMe(m);
      setName(m.name);
      setEmail(m.email ?? '');
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function saveInfo() {
    setSavingInfo(true);
    setError(null);
    try {
      await api.patch('/me/parent', { name, email: email || undefined }, token);
      setNotice('Profil güncellendi.');
      setTimeout(() => setNotice(null), 3000);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingInfo(false);
    }
  }

  async function savePassword() {
    if (!/^\d{6}$/.test(password)) {
      setError('Şifre 6 rakamdan oluşmalı');
      return;
    }
    setSavingPwd(true);
    setError(null);
    try {
      await api.post('/me/parent/password', { password }, token);
      setPassword('');
      setNotice('Şifre değiştirildi.');
      setTimeout(() => setNotice(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />
          <InfoBanner message={notice} />

          <SectionCard title="Profil">
            <Input label="Ad Soyad" value={name} onChangeText={setName} placeholder="Adın Soyadın" autoCapitalize="words" />
            <Input label="E-posta (opsiyonel)" value={email} onChangeText={setEmail} placeholder="ornek@mail.com" keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.readonlyRow}>
              <Text style={styles.readonlyLabel}>Telefon</Text>
              <Text style={styles.readonlyValue}>{me?.phone ?? '—'}</Text>
            </View>
            <Text style={styles.hint}>Telefonunu değiştirmek için destek@bindi.com.tr'ye yaz.</Text>
            <Button
              label={savingInfo ? 'Kaydediliyor...' : 'Profili Kaydet'}
              onPress={saveInfo}
              loading={savingInfo}
              style={{ marginTop: 8 }}
            />
          </SectionCard>

          <SectionCard title="Şifre">
            <Input
              label="Yeni Şifre (6 rakam)"
              value={password}
              onChangeText={(v) => setPassword(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              hint="Değiştirmek istemiyorsan boş bırak"
            />
            <Button
              label={savingPwd ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
              variant="secondary"
              onPress={savePassword}
              loading={savingPwd}
              disabled={password.length !== 6}
              style={{ marginTop: 4 }}
            />
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  back: { padding: 6, width: 32 },
  backText: { fontSize: 24, color: colors.dark },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  body: { padding: 20, gap: 16 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 4, paddingHorizontal: 4,
  },
  sectionBody: {
    padding: 16, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  readonlyRow: {
    padding: 12, backgroundColor: colors.bg,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    marginBottom: 6,
  },
  readonlyLabel: {
    fontSize: 10, fontWeight: '800', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  readonlyValue: { fontSize: 14, fontWeight: '700', color: colors.dark, marginTop: 4 },
  hint: { fontSize: 11, color: colors.muted, marginBottom: 8 },
});
