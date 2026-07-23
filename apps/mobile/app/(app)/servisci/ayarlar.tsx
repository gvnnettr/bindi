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
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { Button, ErrorBanner, InfoBanner, Input } from '../../../src/components/ui';
import { colors } from '../../../src/theme/colors';

interface ProviderMe {
  id: string;
  companyName: string;
  ownerName: string;
  taxNo: string | null;
  email: string | null;
  phone: string;
  address: string | null;
  status: string;
}

export default function ServisciAyarlarScreen() {
  const { token } = useAuth();
  const [me, setMe] = useState<ProviderMe | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [taxNo, setTaxNo] = useState('');
  const [address, setAddress] = useState('');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const m = await api.get<ProviderMe>('/me', token);
      setMe(m);
      setCompanyName(m.companyName);
      setOwnerName(m.ownerName);
      setEmail(m.email ?? '');
      setTaxNo(m.taxNo ?? '');
      setAddress(m.address ?? '');
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
      await api.patch('/me', {
        companyName,
        ownerName,
        email: email || undefined,
        taxNo: taxNo || undefined,
        address: address || undefined,
      }, token);
      setNotice('Profil güncellendi.');
      setTimeout(() => setNotice(null), 3000);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setSavingInfo(false);
    }
  }

  async function savePwd() {
    if (currentPwd.length < 1 || !/^\d{6}$/.test(newPwd)) {
      setError('Mevcut şifre + 6 rakamlı yeni şifre gerekli');
      return;
    }
    setSavingPwd(true);
    setError(null);
    try {
      await api.post('/me/password', { currentPassword: currentPwd, newPassword: newPwd }, token);
      setCurrentPwd(''); setNewPwd('');
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

          <Section title="Firma Bilgileri">
            <Input label="Firma Ünvanı" value={companyName} onChangeText={setCompanyName} placeholder="GVN Yazılım Ltd." autoCapitalize="words" />
            <Input label="Yetkili Ad Soyad" value={ownerName} onChangeText={setOwnerName} placeholder="Ad Soyad" autoCapitalize="words" />
            <Input label="Vergi No / TC" value={taxNo} onChangeText={setTaxNo} placeholder="1234567890" keyboardType="number-pad" />
            <Input label="E-posta" value={email} onChangeText={setEmail} placeholder="info@sirket.com" keyboardType="email-address" autoCapitalize="none" />
            <Input
              label="Adres"
              value={address}
              onChangeText={setAddress}
              placeholder="Sokak, mahalle..."
              multiline
              numberOfLines={3}
              style={{ minHeight: 70, textAlignVertical: 'top' }}
            />
            <View style={styles.readonlyRow}>
              <Text style={styles.readonlyLabel}>Telefon</Text>
              <Text style={styles.readonlyValue}>{me?.phone ?? '—'}</Text>
            </View>
            <Text style={styles.hint}>Telefonunu değiştirmek için destek@bindi.com.tr'ye yaz.</Text>
            <Button label={savingInfo ? 'Kaydediliyor...' : 'Kaydet'} onPress={saveInfo} loading={savingInfo} style={{ marginTop: 8 }} />
          </Section>

          <Section title="Şifre Değiştir">
            <Input label="Mevcut Şifre" value={currentPwd} onChangeText={(v) => setCurrentPwd(v.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" secureTextEntry keyboardType="number-pad" maxLength={6} />
            <Input label="Yeni Şifre (6 rakam)" value={newPwd} onChangeText={(v) => setNewPwd(v.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" secureTextEntry keyboardType="number-pad" maxLength={6} />
            <Button
              label={savingPwd ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
              variant="secondary"
              onPress={savePwd}
              loading={savingPwd}
              disabled={!currentPwd || !/^\d{6}$/.test(newPwd)}
              style={{ marginTop: 4 }}
            />
          </Section>

          <Section title="Bilgi">
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hesap Durumu</Text>
              <StatusChip status={me?.status ?? '—'} />
            </View>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active: { label: 'Aktif', bg: colors.successSoft, color: '#065F46' },
    pending_approval: { label: 'Onay Bekliyor', bg: '#FEF3C7', color: '#78350F' },
    pending_payment: { label: 'Ödeme Bekliyor', bg: '#FEF3C7', color: '#78350F' },
    suspended: { label: 'Askıda', bg: '#FEF2F2', color: '#991B1B' },
  };
  const m = map[status] ?? { label: status, bg: colors.bg, color: colors.muted };
  return (
    <View style={[styles.chip, { backgroundColor: m.bg }]}>
      <Text style={[styles.chipText, { color: m.color }]}>{m.label}</Text>
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
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, paddingHorizontal: 4 },
  sectionBody: { padding: 16, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  readonlyRow: { padding: 12, backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 6 },
  readonlyLabel: { fontSize: 10, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  readonlyValue: { fontSize: 14, fontWeight: '700', color: colors.dark, marginTop: 4 },
  hint: { fontSize: 11, color: colors.muted, marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, fontWeight: '700', color: colors.dark },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontSize: 11, fontWeight: '800' },
});
