import { useCallback, useEffect, useState } from 'react';
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
import { api, ApiError } from '../../../../src/api/client';
import { useAuth } from '../../../../src/state/auth';
import { Button, ErrorBanner, Input } from '../../../../src/components/ui';
import { colors } from '../../../../src/theme/colors';

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
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [absenceStudent, setAbsenceStudent] = useState<Student | null>(null);

  function openActions(item: Student) {
    if (!item.isOwner) return;
    Alert.alert(item.name, undefined, [
      { text: 'Düzenle', onPress: () => setEditStudent(item) },
      { text: '📅 Devamsızlık', onPress: () => setAbsenceStudent(item) },
      { text: 'Sil', style: 'destructive', onPress: () => removeStudent(item.id, item.name) },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  }

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
          <Text style={styles.title}>Çocuklarım</Text>
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
          <Pressable
            onPress={() => item.isOwner && setEditStudent(item)}
            onLongPress={() => openActions(item)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.classText}>
                {item.class ?? '—'}
                {item.school ? ` · ${item.school.name}` : ''}
              </Text>
            </View>
            {item.isOwner && (
              <>
                <Pressable
                  onPress={() => setAbsenceStudent(item)}
                  hitSlop={6}
                  style={styles.calBtn}
                >
                  <Text style={styles.calText}>📅</Text>
                </Pressable>
                <Pressable
                  onPress={() => openActions(item)}
                  hitSlop={8}
                  style={styles.moreBtn}
                >
                  <Text style={styles.moreText}>⋯</Text>
                </Pressable>
              </>
            )}
          </Pressable>
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

      <EditStudentModal
        student={editStudent}
        onClose={() => setEditStudent(null)}
        onDone={async () => {
          setEditStudent(null);
          await load();
        }}
      />

      <AbsenceModal
        student={absenceStudent}
        onClose={() => setAbsenceStudent(null)}
      />
    </SafeAreaView>
  );
}

interface Absence {
  id: string;
  date: string;
  session: 'morning' | 'evening' | 'both';
  reason: string | null;
}

function AbsenceModal({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<'morning' | 'evening' | 'both'>('both');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(new Date());

  const load = useCallback(async () => {
    if (!student || !token) return;
    try {
      const y = monthCursor.getFullYear();
      const m = monthCursor.getMonth();
      const from = new Date(y, m, 1).toISOString().slice(0, 10);
      const to = new Date(y, m + 1, 0).toISOString().slice(0, 10);
      const rows = await api.get<Absence[]>(
        `/me/parent/students/${student.id}/absences?from=${from}&to=${to}`,
        token,
      );
      setAbsences(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [student, token, monthCursor]);

  useEffect(() => { void load(); }, [load]);

  async function toggleAbsence() {
    if (!selectedDate || !student) return;
    setLoading(true);
    setError(null);
    try {
      // Ayni gün+session absence varsa sil, yoksa ekle
      const existing = absences.find((a) => a.date === selectedDate && a.session === selectedSession);
      if (existing) {
        await api.del(`/me/parent/students/${student.id}/absences/${existing.id}`, token);
      } else {
        await api.post(
          `/me/parent/students/${student.id}/absences`,
          { date: selectedDate, session: selectedSession },
          token,
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Basit takvim: bu ayın günleri
  const y = monthCursor.getFullYear();
  const m = monthCursor.getMonth();
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Pazartesi=0
  const daysInMonth = lastDay.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function fmt(d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function absenceForDay(d: number): Absence[] {
    const iso = fmt(d);
    return absences.filter((a) => a.date === iso);
  }

  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const weekLabels = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

  return (
    <Modal visible={!!student} animationType="slide" transparent onRequestClose={onClose}>
      <View style={cs.backdrop}>
        <View style={cs.sheet}>
          <View style={cs.grabber} />
          <View style={cs.headerRow}>
            <Text style={cs.title}>{student?.name} — Devamsızlık</Text>
            <Pressable onPress={onClose} hitSlop={12}><Text style={cs.close}>✕</Text></Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {error && <View style={cs.errBox}><Text style={cs.errText}>{error}</Text></View>}

            <View style={cs.monthNav}>
              <Pressable onPress={() => setMonthCursor(new Date(y, m - 1, 1))} hitSlop={8}>
                <Text style={cs.navBtn}>‹</Text>
              </Pressable>
              <Text style={cs.monthTitle}>{monthNames[m]} {y}</Text>
              <Pressable onPress={() => setMonthCursor(new Date(y, m + 1, 1))} hitSlop={8}>
                <Text style={cs.navBtn}>›</Text>
              </Pressable>
            </View>

            <View style={cs.weekRow}>
              {weekLabels.map((w) => (
                <Text key={w} style={cs.weekLabel}>{w}</Text>
              ))}
            </View>

            <View style={cs.grid}>
              {cells.map((c, i) => {
                if (c === null) return <View key={i} style={cs.cell} />;
                const iso = fmt(c);
                const abs = absenceForDay(c);
                const isSelected = selectedDate === iso;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setSelectedDate(iso)}
                    style={[
                      cs.cell,
                      cs.cellActive,
                      isSelected && cs.cellSelected,
                      abs.length > 0 && cs.cellAbsent,
                    ]}
                  >
                    <Text style={[cs.cellText, abs.length > 0 && cs.cellTextAbsent]}>{c}</Text>
                    {abs.length > 0 && (
                      <View style={cs.dotRow}>
                        {abs.some((a) => a.session === 'morning' || a.session === 'both') && <View style={[cs.dot, { backgroundColor: '#F59E0B' }]} />}
                        {abs.some((a) => a.session === 'evening' || a.session === 'both') && <View style={[cs.dot, { backgroundColor: '#8B5CF6' }]} />}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {selectedDate && (
              <View style={cs.actionBox}>
                <Text style={cs.actionLabel}>{formatDateTR(selectedDate)}</Text>
                <View style={cs.sessionRow}>
                  <Pressable
                    onPress={() => setSelectedSession('morning')}
                    style={[cs.sessBtn, selectedSession === 'morning' && cs.sessBtnActive]}
                  >
                    <Text style={cs.sessText}>☀️ Sabah</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedSession('evening')}
                    style={[cs.sessBtn, selectedSession === 'evening' && cs.sessBtnActive]}
                  >
                    <Text style={cs.sessText}>🌇 Akşam</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedSession('both')}
                    style={[cs.sessBtn, selectedSession === 'both' && cs.sessBtnActive]}
                  >
                    <Text style={cs.sessText}>Tam Gün</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={toggleAbsence}
                  disabled={loading}
                  style={[cs.toggleBtn, loading && { opacity: 0.5 }]}
                >
                  <Text style={cs.toggleText}>
                    {absences.some((a) => a.date === selectedDate && a.session === selectedSession)
                      ? '✓ Kaldır (bu gün gelecek)'
                      : 'Bugün Gelmeyecek olarak İşaretle'}
                  </Text>
                </Pressable>
              </View>
            )}

            <Text style={cs.hint}>
              Servisçi, işaretlediğin günlerde bu öğrenciyi rota listesinde görmez.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function formatDateTR(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${d} ${monthNames[m - 1]} ${y}`;
}

const cs = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  grabber: { width: 40, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, alignSelf: 'center' as const, marginTop: 10 },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 16, fontWeight: '800' as const, color: colors.dark, flex: 1 },
  close: { fontSize: 20, color: colors.muted, fontWeight: '700' as const },
  errBox: { padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', marginBottom: 10 },
  errText: { color: '#991B1B', fontSize: 12 },
  monthNav: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 8 },
  navBtn: { fontSize: 24, color: colors.dark, paddingHorizontal: 16 },
  monthTitle: { fontSize: 16, fontWeight: '800' as const, color: colors.dark },
  weekRow: { flexDirection: 'row' as const, marginTop: 8, marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center' as const, fontSize: 11, fontWeight: '700' as const, color: colors.muted },
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const },
  cell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 8 },
  cellActive: { backgroundColor: colors.bg },
  cellSelected: { borderWidth: 2, borderColor: colors.dark },
  cellAbsent: { backgroundColor: '#FEF3C7' },
  cellText: { fontSize: 14, fontWeight: '700' as const, color: colors.dark },
  cellTextAbsent: { color: '#78350F' },
  dotRow: { flexDirection: 'row' as const, gap: 3, marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  actionBox: { marginTop: 16, padding: 14, backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  actionLabel: { fontSize: 14, fontWeight: '800' as const, color: colors.dark, marginBottom: 10, textAlign: 'center' as const },
  sessionRow: { flexDirection: 'row' as const, gap: 6, marginBottom: 10 },
  sessBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const },
  sessBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sessText: { fontSize: 12, fontWeight: '700' as const, color: colors.dark },
  toggleBtn: { padding: 12, backgroundColor: colors.dark, borderRadius: 10, alignItems: 'center' as const },
  toggleText: { color: '#fff', fontSize: 13, fontWeight: '800' as const },
  hint: { fontSize: 11, color: colors.muted, textAlign: 'center' as const, marginTop: 12, fontStyle: 'italic' as const },
});

function EditStudentModal({
  student,
  onClose,
  onDone,
}: {
  student: Student | null;
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

  useEffect(() => {
    if (!student) return;
    setName(student.name);
    setStudentClass(student.class ?? '');
    setSelectedSchool(student.school as School | null);
    setSchoolQ('');
    (async () => {
      try {
        const s = await api.get<School[]>('/schools', token);
        setSchools(s);
      } catch (e) {
        setError('Okullar yüklenemedi: ' + (e instanceof ApiError ? e.message : (e as Error).message));
      }
    })();
  }, [student, token]);

  const filtered = schoolQ
    ? schools.filter((s) => s.name.toLowerCase().includes(schoolQ.toLowerCase())).slice(0, 8)
    : schools.slice(0, 8);

  async function submit() {
    if (!student) return;
    if (!name.trim()) { setError('Ad soyad gir'); return; }
    setLoading(true);
    setError(null);
    try {
      await api.patch(
        `/me/parent/students/${student.id}`,
        {
          name: name.trim(),
          class: studentClass.trim() || null,
          schoolId: selectedSchool?.id,
        },
        token,
      );
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={!!student} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <View style={modalStyles.sheet}>
            <View style={modalStyles.grabber} />
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Öğrenciyi Düzenle</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={modalStyles.close}>✕</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
              <ErrorBanner message={error} />
              <Input label="Ad Soyad" value={name} onChangeText={setName} />
              <Input label="Sınıf" value={studentClass} onChangeText={setStudentClass} placeholder="Örn: 3. Sınıf" />

              <Text style={modalStyles.subLabel}>Okul</Text>
              <Input
                value={schoolQ}
                onChangeText={setSchoolQ}
                placeholder={selectedSchool ? selectedSchool.name : 'Okul ara...'}
              />
              <View style={modalStyles.schoolList}>
                {filtered.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setSelectedSchool(s)}
                    style={[
                      modalStyles.schoolRow,
                      selectedSchool?.id === s.id && { borderColor: colors.primaryDark, backgroundColor: colors.primarySoft },
                    ]}
                  >
                    <Text style={modalStyles.schoolName}>{s.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{s.district}, {s.city}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Button
              label="Kaydet"
              onPress={submit}
              loading={loading}
              style={{ marginTop: 12 }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const s = await api.get<School[]>('/schools', token);
        setSchools(s);
      } catch (e) {
        setError('Okullar yüklenemedi: ' + (e instanceof ApiError ? e.message : (e as Error).message));
      }
    })();
  }, [visible, token]);

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
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { fontSize: 20, color: colors.dark, fontWeight: '800', marginTop: -6 },
  calBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', marginRight: 4,
  },
  calText: { fontSize: 16 },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 260 },
});
