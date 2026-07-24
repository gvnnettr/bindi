import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator,
  Alert, Image, Modal, TextInput, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../../src/api/client';
import { API_URL } from '../../../../src/api/config';
import { useAuth } from '../../../../src/state/auth';
import { useTakipPaket } from '../../../../src/hooks/useTakipPaket';
import { TakipGate } from '../../../../src/components/TakipGate';
import { colors } from '../../../../src/theme/colors';

interface EarningsReport {
  monthly: Array<{ period: string; revenue: number; paymentCount: number }>;
  totalPaid: number;
  pendingAmount: number;
  paidCount: number;
  unpaidCount: number;
}

interface PaymentItem {
  id: string;
  period: string;
  amount: number;
  status: 'pending' | 'submitted' | 'paid' | 'cancelled';
  receiptUrl: string | null;
  parentNote: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  student: { id: string; name: string };
  parent: { id: string; name: string; phone: string };
}

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function periodLabel(period: string): string {
  const [, m] = period.split('-').map(Number);
  return MONTHS_TR[(m ?? 1) - 1];
}

export default function KazancRaporuScreen() {
  const { active } = useTakipPaket();
  return (
    <TakipGate
      active={active}
      featureName="Kazanç Raporu"
      featureDesc="12 aylık gelir grafiği ve ödeme istatistikleri için Takip Paketi'ne ihtiyacın var."
    >
      <KazancContent />
    </TakipGate>
  );
}

function KazancContent() {
  const { token } = useAuth();
  const [data, setData] = useState<EarningsReport | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingPayment, setReviewingPayment] = useState<PaymentItem | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [r, p] = await Promise.all([
        api.get<EarningsReport>('/me/earnings/report', token),
        api.get<PaymentItem[]>('/me/payments', token),
      ]);
      setData(r);
      setPayments(p);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [token]);

  async function remindPayment(p: PaymentItem) {
    try {
      await api.post(`/me/payments/${p.id}/remind`, {}, token);
      Alert.alert('Hatırlatma gönderildi', `${p.parent.name} adlı veliye SMS ve bildirim gitti.`);
      await load();
    } catch (e) {
      Alert.alert('Hatırlatma gönderilemedi', e instanceof ApiError ? e.message : (e as Error).message);
    }
  }

  async function rejectPayment(p: PaymentItem, reason: string) {
    try {
      await api.patch(
        `/me/payments/${p.id}/status`,
        { status: 'pending', providerNote: reason },
        token,
      );
      setReviewingPayment(null);
      await load();
    } catch (e) {
      Alert.alert('Reddedilemedi', (e as Error).message);
    }
  }

  async function approvePayment(p: PaymentItem) {
    try {
      await api.patch(
        `/me/payments/${p.id}/status`,
        { status: 'paid' },
        token,
      );
      Alert.alert('Onaylandı ✅', `${p.parent.name}: ${p.period} dönemi ${p.amount}₺ ödemesi kabul edildi. Veliye bildirim gitti.`);
      await load();
    } catch (e) {
      Alert.alert('Onaylanamadı', (e as Error).message);
    }
  }

  const submittedPayments = payments.filter((p) => p.status === 'submitted');
  const pendingPayments = payments.filter((p) => p.status === 'pending');

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const maxRevenue = Math.max(1, ...(data?.monthly.map((m) => m.revenue) ?? []));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ width: 32 }} />
        <Text style={styles.headerTitle}>Ödemeler</Text>
        <View style={{ width: 32 }} />
      </View>

      {!data ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.muted} />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        >
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Toplam Kazanç (Son 12 Ay)</Text>
            <Text style={styles.heroValue}>₺{data.totalPaid.toLocaleString('tr-TR')}</Text>
            <View style={styles.heroMeta}>
              <Text style={styles.heroSub}>{data.paidCount} ödeme alındı</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Text style={styles.statLabel}>Bekleyen</Text>
              <Text style={[styles.statValue, { color: '#78350F' }]}>₺{data.pendingAmount.toLocaleString('tr-TR')}</Text>
              <Text style={styles.statSub}>{data.unpaidCount} ödeme</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.successSoft, borderColor: '#A7F3D0' }]}>
              <Text style={styles.statLabel}>Ödendi</Text>
              <Text style={[styles.statValue, { color: '#065F46' }]}>{data.paidCount}</Text>
              <Text style={styles.statSub}>işlem</Text>
            </View>
          </View>

          {submittedPayments.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Dekont Bekleyen ({submittedPayments.length})</Text>
              {submittedPayments.map((p) => (
                <View key={p.id} style={styles.pendingCard}>
                  <View style={styles.pendingHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingParent}>{p.parent.name}</Text>
                      <Text style={styles.pendingStudent}>{p.student.name} · {p.period}</Text>
                    </View>
                    <Text style={styles.pendingAmount}>₺{p.amount.toLocaleString('tr-TR')}</Text>
                  </View>
                  {p.receiptUrl && (
                    <Pressable
                      onPress={() => Linking.openURL(`${API_URL.replace(/\/api$/, '')}${p.receiptUrl}`)}
                      style={styles.receiptPreview}
                    >
                      <Image
                        source={{ uri: `${API_URL.replace(/\/api$/, '')}${p.receiptUrl}` }}
                        style={styles.receiptImg}
                        resizeMode="cover"
                      />
                      <Text style={styles.receiptHint}>📄 Dekonta tıkla, büyütmek için</Text>
                    </Pressable>
                  )}
                  {p.parentNote && (
                    <Text style={styles.pendingNote}>💬 "{p.parentNote}"</Text>
                  )}
                  <View style={styles.pendingActions}>
                    <Pressable
                      onPress={() => setReviewingPayment(p)}
                      style={[styles.actionBtn, styles.actionRejectBtn]}
                    >
                      <Text style={styles.actionRejectText}>✕ Reddet</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => Alert.alert(
                        'Ödemeyi onayla',
                        `${p.parent.name}: ${p.period} dönemi ${p.amount}₺ ödemesi onaylanacak. Veliye bildirim gidecek.`,
                        [
                          { text: 'Vazgeç', style: 'cancel' },
                          { text: 'Onayla', onPress: () => approvePayment(p) },
                        ],
                      )}
                      style={[styles.actionBtn, styles.actionApproveBtn]}
                    >
                      <Text style={styles.actionApproveText}>✓ Onayla</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          )}

          {pendingPayments.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Bekleyen Ödemeler ({pendingPayments.length})</Text>
              {pendingPayments.map((p) => (
                <View key={p.id} style={styles.reminderCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderParent}>{p.parent.name} · {p.student.name}</Text>
                    <Text style={styles.reminderPeriod}>{p.period} dönemi · ₺{p.amount.toLocaleString('tr-TR')}</Text>
                  </View>
                  <Pressable
                    onPress={() => Alert.alert(
                      'Ödeme hatırlatması',
                      `${p.parent.name} adlı veliye ${p.period} dönemi ödemesi için SMS + bildirim gönderilsin mi?`,
                      [
                        { text: 'Vazgeç', style: 'cancel' },
                        { text: 'Gönder', onPress: () => remindPayment(p) },
                      ],
                    )}
                    style={styles.remindBtn}
                  >
                    <Text style={styles.remindBtnText}>⏰ Hatırlat</Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Aylık Gelir</Text>
          {data.monthly.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Henüz ödeme geliri yok</Text>
              <Text style={styles.emptySub}>Öğrenci kayıtlarından ödemeler geldikçe burada aylık gelir grafiğin oluşacak.</Text>
            </View>
          ) : (
            <View style={styles.chartBox}>
              <View style={styles.chartBars}>
                {data.monthly.map((m) => {
                  const h = (m.revenue / maxRevenue) * 130;
                  return (
                    <View key={m.period} style={styles.barCol}>
                      <View style={styles.barWrap}>
                        <View style={[styles.bar, { height: Math.max(4, h) }]} />
                      </View>
                      <Text style={styles.barLabel}>{periodLabel(m.period)}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.chartLegend}>
                <Text style={styles.legendText}>
                  En yüksek: ₺{maxRevenue.toLocaleString('tr-TR')}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Ay ay detay</Text>
          <View style={styles.detailBox}>
            {data.monthly.length === 0 && <Text style={styles.emptySub}>Kayıt yok</Text>}
            {data.monthly.slice().reverse().map((m) => (
              <View key={m.period} style={styles.detailRow}>
                <Text style={styles.detailPeriod}>{m.period}</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.detailCount}>{m.paymentCount} ödeme</Text>
                <Text style={styles.detailRevenue}>₺{m.revenue.toLocaleString('tr-TR')}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <RejectModal
        payment={reviewingPayment}
        onClose={() => setReviewingPayment(null)}
        onReject={rejectPayment}
      />
    </SafeAreaView>
  );
}

function RejectModal({
  payment,
  onClose,
  onReject,
}: {
  payment: PaymentItem | null;
  onClose: () => void;
  onReject: (p: PaymentItem, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const commonReasons = [
    'Dekont okunmuyor',
    'Tutar eksik',
    'Yanlış hesap',
    'Tarih yanlış',
  ];

  async function submit() {
    if (!payment) return;
    if (!reason.trim()) {
      Alert.alert('Sebep gir', 'Veliye ne olduğunu bildirmen gerek');
      return;
    }
    setSubmitting(true);
    try {
      await onReject(payment, reason.trim());
      setReason('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={!!payment} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mstyles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={mstyles.sheet}>
            <View style={mstyles.grabber} />
            <Text style={mstyles.title}>Dekontu reddet</Text>
            <Text style={mstyles.sub}>
              {payment?.parent.name} adlı veliye "Dekontunuz reddedildi" bildirimi gidecek.
              Kısa bir açıklama yaz:
            </Text>

            <View style={mstyles.reasonChips}>
              {commonReasons.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  style={[mstyles.chip, reason === r && mstyles.chipActive]}
                >
                  <Text style={[mstyles.chipText, reason === r && mstyles.chipTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={mstyles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="Kendi mesajını yaz..."
              multiline
              numberOfLines={3}
            />

            <View style={mstyles.actions}>
              <Pressable onPress={onClose} style={[mstyles.actionBtn, mstyles.cancelBtn]}>
                <Text style={mstyles.cancelText}>Vazgeç</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={submitting}
                style={[mstyles.actionBtn, mstyles.confirmBtn]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={mstyles.confirmText}>Reddet & Bildir</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },
  body: { padding: 20, gap: 16 },
  hero: {
    backgroundColor: colors.dark, padding: 20, borderRadius: 20, gap: 4,
  },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { fontSize: 38, fontWeight: '800', color: colors.primary, letterSpacing: -1 },
  heroMeta: { flexDirection: 'row', gap: 12 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  gridRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  statLabel: { fontSize: 11, fontWeight: '800', color: colors.dark, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7 },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  statSub: { fontSize: 10, color: colors.dark, opacity: 0.7, marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  chartBox: {
    padding: 16, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  chartBars: {
    flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 6, justifyContent: 'space-between',
  },
  barCol: { alignItems: 'center', flex: 1, gap: 6 },
  barWrap: { height: 130, justifyContent: 'flex-end' },
  bar: {
    width: 18, backgroundColor: colors.primary, borderRadius: 4,
  },
  barLabel: { fontSize: 9, color: colors.muted, fontWeight: '700' },
  chartLegend: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  legendText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  detailBox: {
    padding: 14, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailPeriod: { fontSize: 12, fontWeight: '800', color: colors.dark, width: 65 },
  detailCount: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  detailRevenue: { fontSize: 13, fontWeight: '800', color: colors.dark, minWidth: 80, textAlign: 'right' },
  emptyBox: {
    padding: 30, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },

  pendingCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 10,
  },
  pendingHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  pendingParent: { fontSize: 15, fontWeight: '800', color: colors.dark },
  pendingStudent: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pendingAmount: { fontSize: 18, fontWeight: '800', color: colors.dark },
  receiptPreview: {
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  receiptImg: { width: '100%', height: 180 },
  receiptHint: { fontSize: 11, color: colors.muted, textAlign: 'center', padding: 8 },
  pendingNote: {
    fontSize: 12,
    color: colors.dark,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionRejectBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  actionRejectText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  actionApproveBtn: {
    backgroundColor: colors.success,
  },
  actionApproveText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reminderParent: { fontSize: 13, fontWeight: '700', color: colors.dark },
  reminderPeriod: { fontSize: 11, color: colors.muted, marginTop: 2 },
  remindBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.dark,
  },
  remindBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});

const mstyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.dark },
  sub: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
  reasonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  chipTextActive: { color: '#fff', fontWeight: '800' },
  input: {
    marginTop: 12,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.dark,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.dark, fontWeight: '700', fontSize: 14 },
  confirmBtn: { backgroundColor: colors.danger },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
