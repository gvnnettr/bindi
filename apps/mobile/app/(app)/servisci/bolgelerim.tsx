import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { ErrorBanner, Input } from '../../../src/components/ui';
import { colors } from '../../../src/theme/colors';

interface Region {
  id: string;
  city: string;
  district: string;
}

export default function BolgelerimScreen() {
  const { token } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [enabledCities, setEnabledCities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [r, cities] = await Promise.all([
        api.get<Region[]>('/me/regions', token),
        api.get<string[]>('/cities/public'),
      ]);
      setRegions(r);
      setEnabledCities(cities);
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

  async function removeRegion(id: string, label: string) {
    try {
      await api.del(`/me/regions/${id}`, token);
      setRegions((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(`${label} silinemedi: ${(e as Error).message}`);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Hizmet Bölgelerim</Text>
          <Text style={styles.sub}>{regions.length} il/ilçe · yeni talepler bu bölgelerde bildirilir</Text>
        </View>
        <Pressable
          onPress={() => setModalOpen(true)}
          style={styles.addBtn}
          hitSlop={8}
        >
          <Text style={styles.addBtnText}>+ Ekle</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
      >
        <ErrorBanner message={error} />

        {regions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>Henüz bölge eklemedin</Text>
            <Text style={styles.emptySub}>
              Hangi il/ilçelerde hizmet vermek istediğini seç. Sadece bu bölgelerdeki talepleri görür ve teklif verebilirsin.
            </Text>
            <Pressable
              onPress={() => setModalOpen(true)}
              style={styles.emptyCta}
            >
              <Text style={styles.emptyCtaText}>İlk Bölgeni Ekle</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {regions.map((r) => (
              <View key={r.id} style={styles.item}>
                <View style={styles.iconWrap}>
                  <Text style={styles.iconText}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{r.district}</Text>
                  <Text style={styles.itemSub}>{r.city}</Text>
                </View>
                <Pressable
                  onPress={() => removeRegion(r.id, `${r.district}, ${r.city}`)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <AddRegionModal
        visible={modalOpen}
        enabledCities={enabledCities}
        onClose={() => setModalOpen(false)}
        onDone={async () => {
          setModalOpen(false);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function AddRegionModal({
  visible,
  enabledCities,
  onClose,
  onDone,
}: {
  visible: boolean;
  enabledCities: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!city.trim() || !district.trim()) {
      setError('İl ve ilçe zorunlu');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/me/regions', { city: city.trim(), district: district.trim() }, token);
      setCity('');
      setDistrict('');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mstyles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <View style={mstyles.sheet}>
            <View style={mstyles.grabber} />
            <View style={mstyles.headerRow}>
              <Text style={mstyles.title}>Bölge Ekle</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={mstyles.close}>✕</Text>
              </Pressable>
            </View>

            <ErrorBanner message={error} />

            <Text style={mstyles.label}>İl</Text>
            <View style={mstyles.chipRow}>
              {enabledCities.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCity(c)}
                  style={[mstyles.chip, city === c && mstyles.chipActive]}
                >
                  <Text style={[mstyles.chipText, city === c && mstyles.chipTextActive]}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Input
              label="İlçe"
              value={district}
              onChangeText={setDistrict}
              placeholder="Örn: Altınordu, Kadıköy"
            />

            <Pressable
              onPress={submit}
              disabled={loading}
              style={({ pressed }) => [
                mstyles.primaryBtn,
                (loading || pressed) && { opacity: 0.85 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={mstyles.primaryBtnText}>Bölgeyi Ekle</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  back: { fontSize: 28, color: colors.dark, fontWeight: '700', width: 20 },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.dark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  body: { padding: 16, paddingBottom: 40 },
  empty: {
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.dark, marginBottom: 6 },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCtaText: { color: colors.dark, fontWeight: '800', fontSize: 14 },
  list: { gap: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.dark },
  itemSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { fontSize: 14, color: colors.danger, fontWeight: '800' },
});

const mstyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  close: { fontSize: 20, color: colors.muted },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chipTextActive: { color: colors.dark, fontWeight: '800' },
  primaryBtn: {
    backgroundColor: colors.dark,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
