import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
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
import { Button, ErrorBanner, Input } from '../../../src/components/ui';
import { colors } from '../../../src/theme/colors';

interface Guardian {
  id: string;
  parentId: string;
  studentId: string;
  relation: string;
  isPrimary: boolean;
  parent: { id: string; name: string; phone: string };
  student: { id: string; name: string };
}

interface Student {
  id: string;
  name: string;
}

const RELATIONS = [
  { code: 'mother', label: 'Anne' },
  { code: 'father', label: 'Baba' },
  { code: 'grandmother', label: 'Anneanne / Babaanne' },
  { code: 'grandfather', label: 'Dede' },
  { code: 'uncle', label: 'Amca / Dayı' },
  { code: 'aunt', label: 'Teyze / Hala' },
  { code: 'sibling', label: 'Kardeş' },
  { code: 'other', label: 'Diğer' },
];

export default function AileUyeleriScreen() {
  const { token } = useAuth();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [g, s] = await Promise.all([
        api.get<Guardian[]>('/me/parent/guardians', token),
        api.get<Student[]>('/me/parent/students', token),
      ]);
      setGuardians(g);
      setStudents(s);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function remove(g: Guardian) {
    Alert.alert(
      `${g.parent.name} çıkarılsın mı?`,
      `${g.student.name} için erişimi iptal edilecek.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.del(`/me/parent/guardians/${g.id}`, token);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Aile Üyeleri</Text>
        <Pressable onPress={() => setModal(true)} style={styles.addBtn} hitSlop={8}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      <FlatList
        data={guardians}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>Aile üyeleri ne yapar?</Text>
            <Text style={styles.helpText}>
              Davet ettiğin aile üyeleri (anne, dede vs.) çocuğun taleplerini ve teklifleri görebilir. Ödemeleri ve seçimleri sen yaparsın.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aile üyesi eklemedin</Text>
            <Text style={styles.emptySub}>Anne, dede, kardeş gibi diğer aile bireylerini davet edebilirsin.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const rel = RELATIONS.find((r) => r.code === item.relation)?.label ?? item.relation;
          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.parent.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.parent.name}</Text>
                <Text style={styles.relation}>{rel} · {item.student.name}</Text>
                <Text style={styles.phone}>{item.parent.phone}</Text>
              </View>
              {!item.isPrimary && (
                <Pressable onPress={() => remove(item)} hitSlop={8}>
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />

      <InviteModal
        visible={modal}
        onClose={() => setModal(false)}
        students={students}
        onDone={async () => {
          setModal(false);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function InviteModal({
  visible,
  onClose,
  students,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  students: Student[];
  onDone: () => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('mother');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name || phone.length < 10 || selectedStudentIds.length === 0) {
      setError('Tüm alanları doldur');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(
        '/me/parent/guardians',
        { name, phone, relation, studentIds: selectedStudentIds },
        token,
      );
      setName(''); setPhone(''); setSelectedStudentIds([]);
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
              <Text style={ms.title}>Aile Üyesi Davet Et</Text>
              <Pressable onPress={onClose} hitSlop={12}><Text style={ms.close}>✕</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={ms.body} keyboardShouldPersistTaps="handled">
              <ErrorBanner message={error} />
              <Input label="Ad Soyad" value={name} onChangeText={setName} placeholder="Ayşe Öztürk" autoCapitalize="words" />
              <Input label="Telefon" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 11))} placeholder="05XX XXX XX XX" keyboardType="phone-pad" maxLength={11} />

              <Text style={ms.subLabel}>Yakınlık</Text>
              <View style={ms.relGrid}>
                {RELATIONS.map((r) => (
                  <Pressable
                    key={r.code}
                    onPress={() => setRelation(r.code)}
                    style={[ms.relChip, relation === r.code && ms.relChipActive]}
                  >
                    <Text style={[ms.relChipText, relation === r.code && ms.relChipTextActive]}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={ms.subLabel}>Hangi öğrenciler için</Text>
              {students.length === 0 ? (
                <Text style={ms.hint}>Önce öğrenci eklemelisin</Text>
              ) : (
                <View style={ms.studentGrid}>
                  {students.map((s) => {
                    const active = selectedStudentIds.includes(s.id);
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setSelectedStudentIds((p) => active ? p.filter((x) => x !== s.id) : [...p, s.id])}
                        style={[ms.studentChip, active && ms.studentChipActive]}
                      >
                        <Text style={[ms.studentChipText, active && ms.studentChipTextActive]}>{s.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Button
                label={loading ? 'Davet gönderiliyor...' : 'Davet Et'}
                onPress={submit}
                loading={loading}
                disabled={!name || phone.length < 10 || selectedStudentIds.length === 0}
                style={{ marginTop: 12 }}
              />
              <Text style={ms.hint}>Davet edilen kişi SMS ile bilgilendirilir ve panele giriş yaparak öğrenci taleplerini görebilir.</Text>
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
  subLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginBottom: 6 },
  relGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  relChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  relChipActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  relChipText: { fontSize: 11, fontWeight: '700', color: colors.dark },
  relChipTextActive: { color: '#fff' },
  studentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  studentChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  studentChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  studentChipText: { fontSize: 12, fontWeight: '700', color: colors.dark },
  studentChipTextActive: { color: colors.dark },
  hint: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 16 },
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
  helpBox: {
    padding: 14, backgroundColor: colors.primarySoft, borderRadius: 12,
    borderWidth: 1, borderColor: colors.primary + '40', marginBottom: 4,
  },
  helpTitle: { fontSize: 12, fontWeight: '800', color: '#78350F' },
  helpText: { fontSize: 12, color: '#78350F', marginTop: 4, lineHeight: 18 },
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
  name: { fontSize: 14, fontWeight: '800', color: colors.dark },
  relation: { fontSize: 11, color: colors.muted, marginTop: 2 },
  phone: { fontSize: 11, color: colors.muted, marginTop: 2 },
  remove: { fontSize: 20, color: colors.muted, padding: 8 },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },
});
