import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api, ApiError } from '../../../../src/api/client';
import { API_URL } from '../../../../src/api/config';
import { useAuth } from '../../../../src/state/auth';
import { Button, ErrorBanner } from '../../../../src/components/ui';
import { colors } from '../../../../src/theme/colors';

type PaymentStatus = 'pending' | 'submitted' | 'paid' | 'late' | 'waived';

interface Payment {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  receiptUrl: string | null;
  parentNote: string | null;
  providerNote: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  student: { id: string; name: string };
  provider: { id: string; companyName: string; phone: string };
}

function formatPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${months[(m ?? 1) - 1]} ${y}`;
}

function daysUntil(iso: string): number {
  const d = new Date(iso).getTime();
  return Math.floor((d - Date.now()) / (1000 * 60 * 60 * 24));
}

const STATUS_MAP: Record<PaymentStatus, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'Ödenmedi', color: '#78350F', bg: '#FEF3C7', border: '#FDE68A' },
  submitted: { label: 'Onay Bekliyor', color: '#3730A3', bg: '#EEF2FF', border: '#C7D2FE' },
  paid: { label: 'Ödendi', color: '#065F46', bg: colors.successSoft, border: '#A7F3D0' },
  late: { label: 'Gecikti', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
  waived: { label: 'İptal', color: colors.muted, bg: '#F3F4F6', border: '#E5E7EB' },
};

export default function OdemelerimScreen() {
  const { token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadFor, setUploadFor] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const p = await api.get<Payment[]>('/parent/payments', token);
      setPayments(p);
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

  const summary = {
    total: payments.length,
    pending: payments.filter((p) => p.status === 'pending' || p.status === 'late').length,
    paid: payments.filter((p) => p.status === 'paid').length,
    unpaidAmount: payments.filter((p) => p.status !== 'paid' && p.status !== 'waived').reduce((s, p) => s + p.amount, 0),
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ width: 32 }} />
        <Text style={styles.headerTitle}>Ödemelerim</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>₺{summary.unpaidAmount.toLocaleString('tr-TR')}</Text>
          <Text style={styles.summaryLabel}>Ödenmesi gereken</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.pending}</Text>
          <Text style={styles.summaryLabel}>Bekleyen</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.paid}</Text>
          <Text style={styles.summaryLabel}>Ödenmiş</Text>
        </View>
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      <FlatList
        data={payments}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Ödeme kaydın yok</Text>
            <Text style={styles.emptySub}>Aktif servis anlaşman olduğunda aylık ödemeler burada listelenir.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const s = STATUS_MAP[item.status];
          const days = daysUntil(item.dueDate);
          const canUpload = item.status === 'pending' || item.status === 'late';
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.period}>{formatPeriod(item.period)}</Text>
                  <Text style={styles.student}>{item.student.name} · {item.provider.companyName}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
                  <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tutar</Text>
                <Text style={styles.priceValue}>₺{item.amount.toLocaleString('tr-TR')}</Text>
              </View>

              {item.status === 'pending' && (
                <Text style={styles.dueText}>
                  {days > 0 ? `${days} gün içinde son ödeme` : days === 0 ? 'Bugün son gün' : `${Math.abs(days)} gün gecikti`}
                </Text>
              )}

              {item.receiptUrl && (
                <Text style={styles.receiptText}>📄 Dekont yüklendi{item.submittedAt ? ` · ${new Date(item.submittedAt).toLocaleDateString('tr-TR')}` : ''}</Text>
              )}

              {item.providerNote && (
                <View style={styles.providerNote}>
                  <Text style={styles.providerNoteLabel}>Servisçi notu:</Text>
                  <Text style={styles.providerNoteText}>{item.providerNote}</Text>
                </View>
              )}

              {canUpload && (
                <Pressable onPress={() => setUploadFor(item)} style={styles.uploadBtn}>
                  <Text style={styles.uploadBtnText}>+ Dekont Yükle</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />

      <ReceiptUploadModal
        payment={uploadFor}
        onClose={() => setUploadFor(null)}
        onDone={async () => {
          setUploadFor(null);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function ReceiptUploadModal({
  payment,
  onClose,
  onDone,
}: {
  payment: Payment | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const [uri, setUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickImage() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Galeri izni gerekli');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    setError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Kamera izni gerekli');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri);
    }
  }

  async function upload() {
    if (!uri || !payment) return;
    setLoading(true);
    setError(null);
    try {
      // iOS local URI (file:///...) — HEIC ihtimali için mimeType tespit et
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType =
        ext === 'png' ? 'image/png' :
        ext === 'heic' ? 'image/heic' :
        ext === 'webp' ? 'image/webp' :
        ext === 'pdf' ? 'application/pdf' :
        'image/jpeg';
      const form = new FormData();
      form.append('file', {
        uri,
        name: `receipt-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`,
        type: mimeType,
      } as any);
      if (note) form.append('parentNote', note);
      const res = await fetch(`${API_URL}/parent/payments/${payment.id}/receipt`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          // Content-Type header koyma — RN otomatik boundary üretir
        },
        body: form,
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const text = await res.text();
          msg = JSON.parse(text)?.message ?? text.slice(0, 120);
        } catch {}
        throw new Error(msg);
      }
      setUri(null);
      setNote('');
      onDone();
    } catch (e) {
      setError('Dekont yüklenemedi: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={!!payment} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mstyles.backdrop}>
        <View style={mstyles.sheet}>
          <View style={mstyles.grabber} />
          <View style={mstyles.headerRow}>
            <Text style={mstyles.title}>Dekont Yükle</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={mstyles.close}>✕</Text>
            </Pressable>
          </View>

          <View style={mstyles.body}>
            {payment && (
              <View style={mstyles.paymentInfo}>
                <Text style={mstyles.infoLine}>
                  {formatPeriod(payment.period)} · {payment.student.name}
                </Text>
                <Text style={mstyles.infoAmount}>₺{payment.amount.toLocaleString('tr-TR')}</Text>
              </View>
            )}

            <ErrorBanner message={error} />

            {!uri ? (
              <View style={mstyles.pickerRow}>
                <Pressable style={mstyles.pickerBtn} onPress={takePhoto}>
                  <Text style={mstyles.pickerBtnEmoji}>📷</Text>
                  <Text style={mstyles.pickerBtnText}>Kamera</Text>
                </Pressable>
                <Pressable style={mstyles.pickerBtn} onPress={pickImage}>
                  <Text style={mstyles.pickerBtnEmoji}>🖼️</Text>
                  <Text style={mstyles.pickerBtnText}>Galeri</Text>
                </Pressable>
              </View>
            ) : (
              <View style={mstyles.previewBox}>
                <Text style={mstyles.previewText}>✓ Dosya seçildi</Text>
                <Pressable onPress={() => setUri(null)}>
                  <Text style={mstyles.previewClear}>Değiştir</Text>
                </Pressable>
              </View>
            )}

            <Button
              label={loading ? 'Yükleniyor...' : 'Dekontu Gönder'}
              onPress={upload}
              loading={loading}
              disabled={!uri}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const mstyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  grabber: { width: 40, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  close: { fontSize: 20, color: colors.muted, fontWeight: '700' },
  body: { padding: 20, gap: 12 },
  paymentInfo: {
    padding: 12, backgroundColor: colors.primarySoft, borderRadius: 12,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  infoLine: { fontSize: 15, fontWeight: '700', color: '#78350F' },
  infoAmount: { fontSize: 22, fontWeight: '800', color: '#78350F', marginTop: 2 },
  pickerRow: { flexDirection: 'row', gap: 10 },
  pickerBtn: {
    flex: 1, padding: 20, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', gap: 6,
  },
  pickerBtnEmoji: { fontSize: 32 },
  pickerBtnText: { fontSize: 15, fontWeight: '700', color: colors.dark },
  previewBox: {
    padding: 20, backgroundColor: colors.successSoft, borderRadius: 12,
    borderWidth: 1, borderColor: '#A7F3D0',
    alignItems: 'center', gap: 8,
  },
  previewText: { fontSize: 15, fontWeight: '800', color: '#065F46' },
  previewClear: { fontSize: 15, color: '#065F46', fontWeight: '700', textDecorationLine: 'underline' },
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
  summaryBar: {
    flexDirection: 'row', backgroundColor: colors.card,
    padding: 16, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: colors.border },
  summaryValue: { fontSize: 16, fontWeight: '800', color: colors.dark },
  summaryLabel: { fontSize: 10, color: colors.muted, marginTop: 2, fontWeight: '600' },
  errorBox: { marginHorizontal: 20, padding: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 10 },
  errorText: { color: '#991B1B', fontSize: 15, fontWeight: '600' },
  list: { padding: 20, paddingTop: 4, gap: 10, flexGrow: 1 },
  card: { padding: 14, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  period: { fontSize: 15, fontWeight: '800', color: colors.dark },
  student: { fontSize: 15, color: colors.muted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bg, padding: 10, borderRadius: 10, marginBottom: 6,
  },
  priceLabel: { fontSize: 15, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceValue: { fontSize: 18, fontWeight: '800', color: colors.dark },
  dueText: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  receiptText: { fontSize: 15, color: colors.success, fontWeight: '700' },
  providerNote: {
    padding: 10, backgroundColor: '#EEF2FF', borderRadius: 8,
    borderWidth: 1, borderColor: '#C7D2FE', marginTop: 4,
  },
  providerNoteLabel: { fontSize: 10, fontWeight: '800', color: '#3730A3', textTransform: 'uppercase', letterSpacing: 0.5 },
  providerNoteText: { fontSize: 15, color: '#3730A3', marginTop: 3 },
  uploadBtn: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: colors.dark, alignItems: 'center' },
  uploadBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },
});
