import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../../src/api/client';
import { useAuth } from '../../../../src/state/auth';
import { ErrorBanner, InfoBanner } from '../../../../src/components/ui';
import { colors } from '../../../../src/theme/colors';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  seats: number;
}

interface VehicleStudent {
  id: string;
  orderNo: number | null;
  student: { id: string; name: string; class: string | null };
  school: { id: string; name: string } | null;
  parentPhone: string;
  address: string | null;
}

interface UnassignedEnrollment {
  id: string;
  student: { id: string; name: string };
  school: { name: string } | null;
}

interface DocRow {
  definition: {
    id: string;
    code: string;
    name: string;
    required: boolean;
    requiresExpiry: boolean;
    description: string | null;
  };
  document: {
    id: string;
    fileUrl: string;
    originalName: string | null;
    issuedAt: string | null;
    expiresAt: string | null;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason: string | null;
    createdAt: string;
    daysToExpiry: number | null;
    expiryStatus: 'ok' | 'soon' | 'expired' | 'na';
  } | null;
}

export default function AracDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [students, setStudents] = useState<VehicleStudent[]>([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const [vs, ds, sts] = await Promise.all([
        api.get<Vehicle[]>('/me/vehicles', token),
        api.get<DocRow[]>(`/me/vehicles/${id}/documents`, token),
        api.get<VehicleStudent[]>(`/me/vehicles/${id}/students`, token),
      ]);
      setVehicle(vs.find((v) => v.id === id) ?? null);
      setDocs(ds);
      setStudents(sts);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [id, token]);

  async function moveStudent(index: number, dir: 'up' | 'down') {
    const newList = [...students];
    const swapIdx = dir === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[index], newList[swapIdx]] = [newList[swapIdx], newList[index]];
    setStudents(newList);
    try {
      await api.patch(
        `/me/vehicles/${id}/students-order`,
        { enrollmentIds: newList.map((s) => s.id) },
        token,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
      await load();
    }
  }

  async function removeStudent(enrollmentId: string) {
    try {
      await api.patch(
        `/me/vehicle-pool/assign/${enrollmentId}`,
        { vehicleId: null },
        token,
      );
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const required = docs.filter((d) => d.definition.required);
  const approved = required.filter((d) => d.document?.status === 'approved').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Araç Detayı</Text>
        <View style={{ width: 32 }} />
      </View>

      {vehicle && (
        <View style={styles.vehicleBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleBrand}>{vehicle.brand} {vehicle.model}</Text>
            <Text style={styles.vehicleMeta}>{vehicle.year} · {vehicle.seats} kişilik</Text>
          </View>
          <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
      >
        {error && <ErrorBanner message={error} />}
        {notice && <InfoBanner message={notice} />}

        {required.length > 0 && (
          <View style={styles.progressBox}>
            <View style={styles.progressRow}>
              <Text style={styles.progressNum}>{approved}/{required.length}</Text>
              <Text style={styles.progressLabel}>zorunlu belge onaylı</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(approved / required.length) * 100}%` }]} />
            </View>
          </View>
        )}

        {/* Ogrenciler bolumu */}
        <View style={styles.studentSection}>
          <View style={styles.studentSectionHead}>
            <Text style={styles.sectionTitle}>
              Öğrenciler ({students.length}{vehicle ? `/${vehicle.seats}` : ''})
            </Text>
            <Pressable onPress={() => setShowAddStudent(true)} style={styles.studentAddBtn} hitSlop={8}>
              <Text style={styles.studentAddBtnText}>+ Ekle</Text>
            </Pressable>
          </View>

          {students.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptySub}>
                Henüz atanmış öğrenci yok. Teklifin kabul olduğu öğrencileri "+ Ekle" ile bu araca ata.
              </Text>
            </View>
          ) : (
            students.map((s, i) => (
              <View key={s.id} style={styles.studentRow}>
                <View style={styles.studentOrder}>
                  <Text style={styles.studentOrderNum}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{s.student.name}</Text>
                  <Text style={styles.studentMeta} numberOfLines={1}>
                    {s.school?.name ?? '—'}{s.address ? ` · ${s.address}` : ''}
                  </Text>
                </View>
                <View style={styles.studentActions}>
                  <Pressable
                    onPress={() => moveStudent(i, 'up')}
                    disabled={i === 0}
                    style={[styles.arrowBtn, i === 0 && { opacity: 0.3 }]}
                    hitSlop={4}
                  >
                    <Text style={styles.arrowText}>↑</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => moveStudent(i, 'down')}
                    disabled={i === students.length - 1}
                    style={[styles.arrowBtn, i === students.length - 1 && { opacity: 0.3 }]}
                    hitSlop={4}
                  >
                    <Text style={styles.arrowText}>↓</Text>
                  </Pressable>
                  <Pressable onPress={() => removeStudent(s.id)} style={styles.arrowBtn} hitSlop={4}>
                    <Text style={[styles.arrowText, { color: colors.danger }]}>✕</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <Pressable
          onPress={() => router.push(`/(app)/servisci/arac/belgeler/${id}`)}
          style={({ pressed }) => [styles.docsLink, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.docsLinkIcon}>
            <Text style={styles.docsLinkIconText}>📄</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.docsLinkTitle}>Araç Belgeleri</Text>
            <Text style={styles.docsLinkSub}>
              {docs.length > 0
                ? `${docs.filter((d) => d.document?.status === 'approved').length} onaylı · ${docs.length} toplam`
                : 'Sigorta, muayene, K belgesi vb. yükle'}
            </Text>
          </View>
          <Text style={styles.docsLinkChev}>›</Text>
        </Pressable>
      </ScrollView>

      <AddStudentModal
        visible={showAddStudent}
        vehicleId={id ?? ''}
        onClose={() => setShowAddStudent(false)}
        onDone={async () => {
          setShowAddStudent(false);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function AddStudentModal({
  visible,
  vehicleId,
  onClose,
  onDone,
}: {
  visible: boolean;
  vehicleId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const [pool, setPool] = useState<UnassignedEnrollment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<UnassignedEnrollment[]>('/me/vehicle-pool/unassigned', token);
      setPool(r);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { if (visible) void load(); }, [visible, load]));

  async function assign(enrollmentId: string) {
    setBusyId(enrollmentId);
    try {
      await api.patch(
        `/me/vehicle-pool/assign/${enrollmentId}`,
        { vehicleId },
        token,
      );
      await load();
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mstyles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={mstyles.sheet}>
            <View style={mstyles.grabber} />
            <View style={mstyles.headerRow}>
              <Text style={mstyles.title}>Araca Öğrenci Ekle</Text>
              <Pressable onPress={onClose} hitSlop={12}><Text style={mstyles.close}>✕</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={mstyles.body} keyboardShouldPersistTaps="handled">
              <ErrorBanner message={error} />
              {pool.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
                    Atanmamış aktif kayıt yok. Tüm öğrenciler zaten bir araçta.
                  </Text>
                </View>
              ) : (
                pool.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => assign(p.id)}
                    disabled={busyId === p.id}
                    style={({ pressed }) => [
                      styles.studentRow,
                      { marginBottom: 8 },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <View style={styles.studentOrder}>
                      <Text style={styles.studentOrderNum}>+</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{p.student.name}</Text>
                      <Text style={styles.studentMeta}>{p.school?.name ?? '—'}</Text>
                    </View>
                    <Text style={{ fontSize: 22, color: colors.muted }}>›</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const mstyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  grabber: { width: 40, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, alignSelf: 'center' as const, marginTop: 10 },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: '800' as const, color: colors.dark, flex: 1 },
  close: { fontSize: 20, color: colors.muted, fontWeight: '700' as const },
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
  vehicleBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: colors.dark,
  },
  vehicleBrand: { fontSize: 15, fontWeight: '800', color: '#fff' },
  vehicleMeta: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  vehiclePlate: {
    fontSize: 14, fontWeight: '800', color: colors.dark,
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  body: { padding: 20, gap: 10 },
  progressBox: {
    padding: 14, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  progressNum: { fontSize: 22, fontWeight: '800', color: colors.dark },
  progressLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 3 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4,
  },
  docCard: {
    padding: 14, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    gap: 8,
  },
  docCardApproved: { borderColor: colors.success, backgroundColor: colors.successSoft + '55' },
  docCardRejected: { borderColor: colors.danger },
  docCardMissing: { borderColor: colors.warning, borderStyle: 'dashed' },
  docTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  docName: { fontSize: 13, fontWeight: '800', color: colors.dark },
  docDesc: { fontSize: 11, color: colors.muted, marginTop: 3 },
  docMeta: { gap: 4 },
  docExpiry: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  rejectBox: {
    padding: 10, backgroundColor: '#FEF2F2',
    borderRadius: 8, borderWidth: 1, borderColor: '#FECACA',
  },
  rejectLabel: { fontSize: 10, fontWeight: '800', color: '#991B1B', textTransform: 'uppercase', letterSpacing: 0.5 },
  rejectText: { fontSize: 12, color: '#991B1B', marginTop: 3 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
  },
  badgeMissing: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  badgeOpt: { backgroundColor: colors.bg, borderColor: colors.border },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeTextMissing: { color: '#78350F' },
  badgeTextOpt: { color: colors.muted },
  uploadBtn: {
    marginTop: 4, padding: 10, borderRadius: 10, backgroundColor: colors.dark, alignItems: 'center',
  },
  uploadBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  empty: { padding: 20, alignItems: 'center' },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center' },

  studentSection: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
    marginBottom: 4,
  },
  studentSectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  studentAddBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.dark, borderRadius: 8 },
  studentAddBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, backgroundColor: colors.bg, borderRadius: 10,
  },
  studentOrder: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center',
  },
  studentOrderNum: { color: '#fff', fontSize: 13, fontWeight: '800' },
  studentName: { fontSize: 13, fontWeight: '700', color: colors.dark },
  studentMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  studentActions: { flexDirection: 'row', gap: 4 },
  arrowBtn: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  arrowText: { fontSize: 14, color: colors.dark, fontWeight: '700' },
  docsLink: {
    marginTop: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  docsLinkIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  docsLinkIconText: { fontSize: 20 },
  docsLinkTitle: { fontSize: 14, fontWeight: '800', color: colors.dark },
  docsLinkSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  docsLinkChev: { fontSize: 24, color: colors.muted, fontWeight: '400' },
});
