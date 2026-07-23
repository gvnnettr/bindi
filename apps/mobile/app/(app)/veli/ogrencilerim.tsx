import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../src/api/client';
import { useAuth } from '../../../src/state/auth';
import { Button, ErrorBanner, Input } from '../../../src/components/ui';
import { colors } from '../../../src/theme/colors';

interface Student {
  id: string;
  name: string;
  class: string | null;
  school: { id: string; name: string; city: string; district: string } | null;
  isOwner: boolean;
}

interface School {
  id: string;
  name: string;
  city: string;
  district: string;
}

export default function OgrencilerimScreen() {
  const { token } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const s = await api.get<Student[]>('/me/parent/students', token);
      setStudents(s);
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

  async function removeStudent(id: string, name: string) {
    Alert.alert('Silmek istediğine emin misin?', `${name} listenden çıkarılacak.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/me/parent/students/${id}`, token);
            await load();
          } catch (e) {
            const msg = e instanceof ApiError ? e.message : (e as Error).message;
            setError(msg);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Öğrencilerim</Text>
          <Text style={styles.sub}>Servis talebi için tanımlı çocuklar</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setModal(true)} hitSlop={8}>
          <Text style={styles.addBtnText}>+ Ekle</Text>
        </Pressable>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={students}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.dark} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Henüz öğrenci eklemedin</Text>
            <Text style={styles.emptySub}>Servis talebi açabilmek için önce çocuğunun bilgilerini gir.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.classText}>
                {item.class ?? '—'}
                {item.school ? ` · ${item.school.name}` : ''}
              </Text>
              {!item.isOwner && (
                <Text style={styles.guest}>Aile üyesi olarak eklendi</Text>
              )}
            </View>
            {item.isOwner && (
              <Pressable onPress={() => removeStudent(item.id, item.name)} hitSlop={8}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            )}
          </View>
        )}
      />

      <AddStudentModal
        visible={modal}
        onClose={() => setModal(false)}
        onDone={async () => {
          setModal(false);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function AddStudentModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolQ, setSchoolQ] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!visible) return;
      (async () => {
        try {
          const s = await api.get<School[]>('/schools', token);
          setSchools(s);
        } catch {}
      })();
    }, [visible, token]),
  );

  const filtered = schoolQ
    ? schools.filter((s) => s.name.toLowerCase().includes(schoolQ.toLowerCase())).slice(0, 8)
    : schools.slice(0, 8);

  async function submit() {
    if (!name.trim()) { setError('Ad soyad gir'); return; }
    if (!selectedSchool) { setError('Okul seç'); return; }
    setLoading(true);
    setError(null);
    try {
      await api.post(
        '/me/parent/students',
        {
          name: name.trim(),
          class: studentClass.trim() || undefined,
          schoolId: selectedSchool.id,
        },
        token,
      );
      setName('');
      setStudentClass('');
      setSelectedSchool(null);
      setSchoolQ('');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={modalStyles.sheet}>
            <View style={modalStyles.grabber} />
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Öğrenci Ekle</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={modalStyles.close}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
              <ErrorBanner message={error} />
              <Input
                label="Ad Soyad"
                value={name}
                onChangeText={setName}
                placeholder="Ali Öztürk"
                autoFocus
              />
              <Input
                label="Sınıf (opsiyonel)"
                value={studentClass}
                onChangeText={setStudentClass}
                placeholder="3-A"
              />

              <Text style={modalStyles.subLabel}>Okul</Text>
              {selectedSchool ? (
                <Pressable
                  onPress={() => setSelectedSchool(null)}
                  style={modalStyles.selectedSchool}
                >
                  <Text style={modalStyles.selectedSchoolName}>{selectedSchool.name}</Text>
                  <Text style={modalStyles.selectedSchoolLoc}>{selectedSchool.city} · {selectedSchool.district}</Text>
                  <Text style={modalStyles.selectedSchoolClear}>Değiştir</Text>
                </Pressable>
              ) : (
                <>
                  <Input
                    label=""
                    value={schoolQ}
                    onChangeText={setSchoolQ}
                    placeholder="Okul ara..."
                  />
                  <View style={modalStyles.schoolList}>
                    {filtered.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => { setSelectedSchool(s); setSchoolQ(''); }}
                        style={({ pressed }) => [modalStyles.schoolRow, pressed && { opacity: 0.6 }]}
                      >
                        <Text style={modalStyles.schoolName}>{s.name}</Text>
                        <Text style={modalStyles.schoolLoc}>{s.city} · {s.district}</Text>
                      </Pressable>
                    ))}
                    {filtered.length === 0 && (
                      <Text style={modalStyles.noResult}>Sonuç yok</Text>
                    )}
                  </View>
                </>
              )}

              <Button
                label="Ekle"
                onPress={submit}
                loading={loading}
                disabled={!name || !selectedSchool}
                style={{ marginTop: 16 }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  grabber: { width: 40, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark },
  close: { fontSize: 20, color: colors.muted, fontWeight: '700' },
  body: { padding: 20 },
  subLabel: {
    fontSize: 11, fontWeight: '700', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 8,
  },
  selectedSchool: {
    padding: 14, backgroundColor: colors.primarySoft, borderRadius: 12,
    borderWidth: 1, borderColor: colors.primary,
  },
  selectedSchoolName: { fontSize: 14, fontWeight: '800', color: '#78350F' },
  selectedSchoolLoc: { fontSize: 11, color: '#78350F', marginTop: 2 },
  selectedSchoolClear: { fontSize: 11, color: '#78350F', marginTop: 6, fontWeight: '700', textDecorationLine: 'underline' },
  schoolList: { gap: 4 },
  schoolRow: { padding: 12, backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  schoolName: { fontSize: 13, fontWeight: '700', color: colors.dark },
  schoolLoc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  noResult: { fontSize: 12, color: colors.muted, textAlign: 'center', padding: 16 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.dark },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  errorBox: { marginHorizontal: 20, padding: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 10 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },
  list: { padding: 20, paddingTop: 4, gap: 10, flexGrow: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.dark },
  name: { fontSize: 14, fontWeight: '800', color: colors.dark },
  classText: { fontSize: 11, color: colors.muted, marginTop: 2 },
  guest: { fontSize: 10, color: colors.blue, marginTop: 3, fontWeight: '700' },
  remove: { fontSize: 20, color: colors.muted, padding: 8 },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },
});
