import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { useTakipPaket } from '../../../src/hooks/useTakipPaket';
import { TakipGate } from '../../../src/components/TakipGate';
import { Button, ErrorBanner, Input } from '../../../src/components/ui';
import { colors } from '../../../src/theme/colors';

interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseClass: string | null;
  active: boolean;
}

export default function SoforlerimScreen() {
  const { active } = useTakipPaket();
  return (
    <TakipGate
      active={active}
      featureName="Şoförlerim"
      featureDesc="Sürücü listesi ve belge takibi için Takip Paketi'ne ihtiyacın var."
    >
      <SoforlerContent />
    </TakipGate>
  );
}

function SoforlerContent() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<Driver | 'new' | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.get<Driver[]>('/me/drivers', token);
      setRows(d);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function remove(d: Driver) {
    Alert.alert(`${d.name} silinsin mi?`, 'Bu şoför listeden çıkarılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/me/drivers/${d.id}`, token);
            await load();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : (e as Error).message);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Şoförlerim</Text>
        <Pressable onPress={() => setModal('new')} style={styles.addBtn} hitSlop={8}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      <FlatList
        data={rows}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Şoför eklemedin</Text>
            <Text style={styles.emptySub}>Ehliyet, SRC belgesi gibi belgelerini yükleyerek şoförlerini takip et.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/servisci/sofor/${item.id}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={styles.name}>{item.name}</Text>
                {!item.active && (
                  <View style={styles.badge}><Text style={styles.badgeText}>Pasif</Text></View>
                )}
              </View>
              <Text style={styles.phone}>{item.phone}</Text>
              {item.licenseClass && <Text style={styles.license}>Sınıf: {item.licenseClass}</Text>}
            </View>
            <View style={styles.rightCol}>
              <Pressable onPress={(e) => { e.stopPropagation?.(); setModal(item); }} hitSlop={8}>
                <Text style={styles.editText}>Düzenle</Text>
              </Pressable>
              <Pressable onPress={(e) => { e.stopPropagation?.(); remove(item); }} hitSlop={8}>
                <Text style={styles.remove}>Sil</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />

      <DriverModal
        driver={modal}
        onClose={() => setModal(null)}
        onDone={async () => {
          setModal(null);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function DriverModal({ driver, onClose, onDone }: { driver: Driver | 'new' | null; onClose: () => void; onDone: () => void }) {
  const { token } = useAuth();
  const editing = driver && driver !== 'new' ? driver : null;
  const visible = driver !== null;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseClass, setLicenseClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setPhone(editing.phone.replace(/\D/g, '').slice(-11));
      setLicenseClass(editing.licenseClass ?? '');
    } else if (driver === 'new') {
      setName(''); setPhone(''); setLicenseClass('');
    }
    setError(null);
  }, [driver, editing]);

  async function submit() {
    if (!name || phone.length < 10) {
      setError('Ad ve telefon zorunlu');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        phone,
        licenseClass: licenseClass.trim() || undefined,
      };
      if (editing) {
        await api.patch(`/me/drivers/${editing.id}`, payload, token);
      } else {
        await api.post('/me/drivers', payload, token);
      }
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={ms.sheet}>
            <View style={ms.grabber} />
            <View style={ms.headerRow}>
              <Text style={ms.title}>{editing ? 'Şoförü Düzenle' : 'Şoför Ekle'}</Text>
              <Pressable onPress={onClose} hitSlop={12}><Text style={ms.close}>✕</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={ms.body}>
              <ErrorBanner message={error} />
              <Input label="Ad Soyad" value={name} onChangeText={setName} placeholder="Ali Öztürk" autoCapitalize="words" />
              <Input label="Telefon" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 11))} placeholder="05XX XXX XX XX" keyboardType="phone-pad" maxLength={11} />
              <Input label="Ehliyet Sınıfı (opsiyonel)" value={licenseClass} onChangeText={setLicenseClass} placeholder="B, D, E..." autoCapitalize="characters" />
              <Button label={loading ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'} onPress={submit} loading={loading} disabled={!name || phone.length < 10} style={{ marginTop: 12 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  grabber: { width: 40, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  close: { fontSize: 20, color: colors.muted, fontWeight: '700' },
  body: { padding: 20 },
});

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
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: -2 },
  errorBox: { marginHorizontal: 20, marginTop: 8, padding: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 10 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },
  list: { padding: 20, paddingTop: 4, gap: 10, flexGrow: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.blue },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name: { fontSize: 14, fontWeight: '800', color: colors.dark, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 9, fontWeight: '800', color: colors.muted },
  phone: { fontSize: 11, color: colors.muted },
  license: { fontSize: 11, color: colors.muted, marginTop: 2 },
  remove: { fontSize: 10, color: colors.danger, fontWeight: '700', padding: 4 },
  rightCol: { alignItems: 'flex-end', gap: 6 },
  editText: { fontSize: 10, color: colors.blue, fontWeight: '700', padding: 4 },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },
});
