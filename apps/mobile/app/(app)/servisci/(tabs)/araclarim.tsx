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
import { api, ApiError } from '../../../../src/api/client';
import { useAuth } from '../../../../src/state/auth';
import { Button, ErrorBanner, Input } from '../../../../src/components/ui';
import { colors } from '../../../../src/theme/colors';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  seats: number;
}

export default function AraclarimScreen() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<Vehicle | 'new' | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const v = await api.get<Vehicle[]>('/me/vehicles', token);
      setRows(v);
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

  async function remove(v: Vehicle) {
    Alert.alert(`${v.brand} ${v.model} silinsin mi?`, `${v.plate} plakalı araç kalıcı olarak silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/me/vehicles/${v.id}`, token);
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
        <View style={{ width: 32 }} />
        <Text style={styles.headerTitle}>Araçlarım</Text>
        <Pressable onPress={() => setModal('new')} style={styles.addBtn} hitSlop={8}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      <FlatList
        data={rows}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Araç eklemedin</Text>
            <Text style={styles.emptySub}>
              Teklif verirken velilere göstermek için araçlarını ekle. Belgeler admin onayından sonra doğrulanır.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/servisci/arac/${item.id}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.icon}>
              <Text style={styles.iconText}>🚌</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>{item.brand} {item.model}</Text>
              <Text style={styles.meta}>{item.year} · {item.seats} kişilik</Text>
              <Text style={styles.plate}>{item.plate}</Text>
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

      <VehicleModal
        vehicle={modal}
        onClose={() => setModal(null)}
        onDone={async () => {
          setModal(null);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function VehicleModal({
  vehicle,
  onClose,
  onDone,
}: {
  vehicle: Vehicle | 'new' | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const editing = vehicle && vehicle !== 'new' ? vehicle : null;
  const visible = vehicle !== null;
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [seats, setSeats] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setBrand(editing.brand);
      setModel(editing.model);
      setYear(String(editing.year));
      setPlate(editing.plate);
      setSeats(String(editing.seats));
    } else if (vehicle === 'new') {
      setBrand(''); setModel(''); setYear(String(new Date().getFullYear())); setPlate(''); setSeats('14');
    }
    setError(null);
  }, [vehicle, editing]);

  async function submit() {
    if (!brand || !model || !plate) {
      setError('Marka, model, plaka zorunlu');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        brand: brand.trim(),
        model: model.trim(),
        year: Number(year),
        plate: plate.trim().toUpperCase(),
        seats: Number(seats),
      };
      if (editing) {
        await api.patch(`/me/vehicles/${editing.id}`, payload, token);
      } else {
        await api.post('/me/vehicles', payload, token);
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
              <Text style={ms.title}>{editing ? 'Aracı Düzenle' : 'Araç Ekle'}</Text>
              <Pressable onPress={onClose} hitSlop={12}><Text style={ms.close}>✕</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={ms.body}>
              <ErrorBanner message={error} />
              <Input label="Marka" value={brand} onChangeText={setBrand} placeholder="Mercedes" autoCapitalize="words" />
              <Input label="Model" value={model} onChangeText={setModel} placeholder="Sprinter" />
              <View style={ms.row}>
                <View style={{ flex: 1 }}>
                  <Input label="Yıl" value={year} onChangeText={(v) => setYear(v.replace(/\D/g, '').slice(0, 4))} placeholder="2020" keyboardType="number-pad" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Input label="Koltuk" value={seats} onChangeText={(v) => setSeats(v.replace(/\D/g, '').slice(0, 3))} placeholder="14" keyboardType="number-pad" />
                </View>
              </View>
              <Input label="Plaka" value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} placeholder="34 ABC 123" autoCapitalize="characters" />

              <Button label={loading ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'} onPress={submit} loading={loading} style={{ marginTop: 12 }} />
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
  row: { flexDirection: 'row' },
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
  icon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 24 },
  brand: { fontSize: 14, fontWeight: '800', color: colors.dark },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  plate: {
    fontSize: 12, fontWeight: '700', color: colors.dark,
    marginTop: 4, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  rightCol: { alignItems: 'flex-end', gap: 6 },
  editText: { fontSize: 10, color: colors.blue, fontWeight: '700', padding: 4 },
  chev: { fontSize: 22, color: colors.muted },
  remove: { fontSize: 10, color: colors.danger, fontWeight: '700', padding: 4 },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 280 },
});
