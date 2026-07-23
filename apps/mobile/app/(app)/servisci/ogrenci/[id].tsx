import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../../src/api/client';
import { useAuth } from '../../../../src/state/auth';
import { colors } from '../../../../src/theme/colors';

interface EnrollmentDetail {
  id: string;
  status: 'active' | 'ended';
  monthlyPrice: number;
  startMonth: string;
  endMonth: string | null;
  note: string | null;
  student: {
    id: string;
    name: string;
    class: string | null;
    school: { id: string; name: string; city: string; district: string } | null;
  };
  parent: { id: string; name: string; phone: string; email: string | null };
  vehicle: { id: string; brand: string; model: string; plate: string; seats: number } | null;
  payments: Array<{
    id: string;
    period: string;
    amount: number;
    status: string;
    dueDate: string;
    paidAt: string | null;
  }>;
}

function formatPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${months[(m ?? 1) - 1]} ${y}`;
}

export default function OgrenciDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [detail, setDetail] = useState<EnrollmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const d = await api.get<EnrollmentDetail>(`/me/enrollments/${id}`, token);
      setDetail(d);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [id, token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function endEnrollment() {
    if (!detail) return;
    Alert.alert(
      'Kayıt bitirilsin mi?',
      `${detail.student.name} için servis kaydı bitirilecek. Yeni ödeme oluşmaz. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Bitir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/me/enrollments/${detail.id}/end`, {}, token);
              await load();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : (e as Error).message);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Öğrenci Detayı</Text>
        <View style={{ width: 32 }} />
      </View>

      {!detail ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.muted} />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{detail.student.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{detail.student.name}</Text>
            <Text style={styles.meta}>
              {detail.student.class ?? '—'}
              {detail.student.school ? ` · ${detail.student.school.name}` : ''}
            </Text>
            <View style={[styles.statusPill, detail.status === 'active' ? styles.statusActive : styles.statusEnded]}>
              <Text style={[styles.statusText, detail.status === 'active' ? styles.statusTextActive : styles.statusTextEnded]}>
                {detail.status === 'active' ? 'Aktif' : 'Bitti'}
              </Text>
            </View>
          </View>

          <Section title="Ücret">
            <View style={styles.priceBox}>
              <Text style={styles.priceValue}>₺{detail.monthlyPrice.toLocaleString('tr-TR')}</Text>
              <Text style={styles.priceUnit}>/ay</Text>
            </View>
            <Text style={styles.periodText}>{formatPeriod(detail.startMonth)}{detail.endMonth ? ` — ${formatPeriod(detail.endMonth)}` : ' — devam'}</Text>
          </Section>

          <Section title="Veli">
            <Text style={styles.rowValue}>{detail.parent.name}</Text>
            <View style={styles.contactRow}>
              <Pressable onPress={() => Linking.openURL(`tel:${detail.parent.phone}`)} style={styles.contactBtn}>
                <Text style={styles.contactBtnEmoji}>📞</Text>
                <Text style={styles.contactBtnText}>{detail.parent.phone}</Text>
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL(`whatsapp://send?phone=${detail.parent.phone.replace(/\D/g, '')}`)}
                style={[styles.contactBtn, { backgroundColor: '#25D366' }]}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>WA</Text>
              </Pressable>
            </View>
            {detail.parent.email && <Text style={styles.rowMuted}>{detail.parent.email}</Text>}
          </Section>

          {detail.vehicle && (
            <Section title="Araç">
              <Text style={styles.rowValue}>{detail.vehicle.brand} {detail.vehicle.model}</Text>
              <Text style={styles.rowMuted}>{detail.vehicle.plate} · {detail.vehicle.seats} kişilik</Text>
            </Section>
          )}

          {detail.note && (
            <Section title="Not">
              <Text style={styles.rowValue}>{detail.note}</Text>
            </Section>
          )}

          <Section title={`Ödemeler (${detail.payments.length})`}>
            {detail.payments.length === 0 && <Text style={styles.rowMuted}>Ödeme kaydı yok</Text>}
            {detail.payments.slice(0, 6).map((p) => (
              <View key={p.id} style={styles.payRow}>
                <View>
                  <Text style={styles.payPeriod}>{formatPeriod(p.period)}</Text>
                  <Text style={styles.payDue}>Son: {new Date(p.dueDate).toLocaleDateString('tr-TR')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.payAmount}>₺{p.amount.toLocaleString('tr-TR')}</Text>
                  <PayStatus status={p.status} />
                </View>
              </View>
            ))}
          </Section>

          {detail.status === 'active' && (
            <Pressable onPress={endEnrollment} style={styles.endBtn}>
              <Text style={styles.endBtnText}>Kaydı Bitir</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function PayStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    paid: { label: 'Ödendi', color: colors.success },
    pending: { label: 'Bekliyor', color: colors.warning },
    submitted: { label: 'Dekont var', color: colors.blue },
    late: { label: 'Gecikti', color: colors.danger },
    waived: { label: 'İptal', color: colors.muted },
  };
  const m = map[status] ?? { label: status, color: colors.muted };
  return <Text style={[styles.payStatusText, { color: m.color }]}>{m.label}</Text>;
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
  body: { padding: 20, gap: 12 },
  hero: { alignItems: 'center', padding: 20, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 6 },
  avatar: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.dark },
  name: { fontSize: 20, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  meta: { fontSize: 12, color: colors.muted },
  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  statusActive: { backgroundColor: colors.successSoft, borderColor: '#A7F3D0' },
  statusEnded: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  statusText: { fontSize: 11, fontWeight: '800' },
  statusTextActive: { color: '#065F46' },
  statusTextEnded: { color: colors.muted },
  section: { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 4 },
  sectionBody: { padding: 14, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 6 },
  priceBox: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  priceValue: { fontSize: 28, fontWeight: '800', color: colors.dark, letterSpacing: -1 },
  priceUnit: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  periodText: { fontSize: 11, color: colors.muted, marginTop: 4 },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.dark },
  rowMuted: { fontSize: 12, color: colors.muted, marginTop: 2 },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
  },
  contactBtnEmoji: { fontSize: 14 },
  contactBtnText: { fontSize: 12, color: colors.dark, fontWeight: '700' },
  payRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  payPeriod: { fontSize: 13, fontWeight: '700', color: colors.dark },
  payDue: { fontSize: 10, color: colors.muted, marginTop: 2 },
  payAmount: { fontSize: 14, fontWeight: '800', color: colors.dark },
  payStatusText: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  endBtn: {
    marginTop: 10, padding: 14, borderRadius: 14,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    alignItems: 'center',
  },
  endBtnText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
});
