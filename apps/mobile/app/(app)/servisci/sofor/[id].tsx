import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Linking,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api, ApiError } from '../../../../src/api/client';
import { API_URL } from '../../../../src/api/config';
import { useAuth } from '../../../../src/state/auth';
import { Button, ErrorBanner, InfoBanner, Input } from '../../../../src/components/ui';
import { DateField } from '../../../../src/components/DateField';
import { colors } from '../../../../src/theme/colors';

interface Driver {
  id: string;
  fullName: string;
  phone: string;
  licenseNo: string | null;
  active: boolean;
}

interface DocRow {
  definition: {
    id: string; code: string; name: string; required: boolean;
    requiresExpiry: boolean; description: string | null;
  };
  document: {
    id: string; fileUrl: string; originalName: string | null;
    issuedAt: string | null; expiresAt: string | null;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason: string | null;
    daysToExpiry: number | null;
    expiryStatus: 'ok' | 'soon' | 'expired' | 'na';
  } | null;
}

export default function SoforDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadFor, setUploadFor] = useState<DocRow | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const [d, list] = await Promise.all([
        api.get<Driver>(`/me/drivers/${id}`, token),
        api.get<DocRow[]>(`/me/drivers/${id}/documents`, token).catch(() => [] as DocRow[]),
      ]);
      setDriver(d);
      setDocs(list);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [id, token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const required = docs.filter((d) => d.definition.required);
  const approved = required.filter((d) => d.document?.status === 'approved').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Şoför Detayı</Text>
        <View style={{ width: 32 }} />
      </View>

      {!driver ? (
        <View style={styles.loading}><ActivityIndicator color={colors.muted} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {error && <ErrorBanner message={error} />}
          {notice && <InfoBanner message={notice} />}

          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{driver.fullName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{driver.fullName}</Text>
            {driver.licenseNo && <Text style={styles.meta}>Ehliyet: {driver.licenseNo}</Text>}
            <View style={styles.contactRow}>
              <Pressable onPress={() => Linking.openURL(`tel:${driver.phone}`)} style={styles.contactBtn}>
                <Text style={styles.contactBtnText}>📞 {driver.phone}</Text>
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL(`whatsapp://send?phone=${driver.phone.replace(/\D/g, '')}`)}
                style={[styles.contactBtn, { backgroundColor: '#25D366' }]}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>WA</Text>
              </Pressable>
            </View>
          </View>

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

          <Text style={styles.sectionTitle}>Belgeler</Text>
          {docs.map((row) => (
            <DocCard key={row.definition.id} row={row} onUpload={() => setUploadFor(row)} />
          ))}
          {docs.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptySub}>Belge tanımı yok.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <UploadModal
        row={uploadFor}
        driverId={id ?? ''}
        onClose={() => setUploadFor(null)}
        onDone={async () => {
          setUploadFor(null);
          setNotice('Belge yüklendi, admin incelemesine sunuldu.');
          setTimeout(() => setNotice(null), 3000);
          await load();
        }}
      />
    </SafeAreaView>
  );
}

function DocCard({ row, onUpload }: { row: DocRow; onUpload: () => void }) {
  const doc = row.document;
  const isApproved = doc?.status === 'approved';
  return (
    <View style={[
      styles.docCard,
      isApproved && { borderColor: colors.success },
      doc?.status === 'rejected' && { borderColor: colors.danger },
      !doc && row.definition.required && { borderColor: colors.warning, borderStyle: 'dashed' },
    ]}>
      <View style={styles.docTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.docName}>
            {row.definition.name}
            {row.definition.required && <Text style={{ color: colors.danger }}> *</Text>}
          </Text>
          {row.definition.description && <Text style={styles.docDesc}>{row.definition.description}</Text>}
        </View>
        <Badge status={doc?.status ?? (row.definition.required ? 'missing' : 'optional')} />
      </View>
      {doc?.expiresAt && (
        <Text style={styles.docExpiry}>
          Bitiş: {new Date(doc.expiresAt).toLocaleDateString('tr-TR')}
          {doc.expiryStatus === 'soon' && <Text style={{ color: colors.warning, fontWeight: '700' }}> · {doc.daysToExpiry} gün</Text>}
          {doc.expiryStatus === 'expired' && <Text style={{ color: colors.danger, fontWeight: '700' }}> · süresi geçti</Text>}
        </Text>
      )}
      {doc?.status === 'rejected' && doc.rejectionReason && (
        <View style={styles.rejectBox}>
          <Text style={styles.rejectLabel}>Red gerekçesi:</Text>
          <Text style={styles.rejectText}>{doc.rejectionReason}</Text>
        </View>
      )}
      {!isApproved && (
        <Pressable onPress={onUpload} style={styles.uploadBtn}>
          <Text style={styles.uploadBtnText}>{doc ? 'Yeniden Yükle' : 'Yükle'}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Badge({ status }: { status: string }) {
  const m: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: '#FEF3C7', color: '#78350F', label: 'İncelemede' },
    approved: { bg: colors.successSoft, color: '#065F46', label: 'Onaylı' },
    rejected: { bg: '#FEF2F2', color: '#991B1B', label: 'Red' },
    missing: { bg: '#FEF3C7', color: '#78350F', label: 'Eksik' },
    optional: { bg: colors.bg, color: colors.muted, label: 'Opsiyonel' },
  };
  const s = m[status] ?? m.optional;
  return <View style={[styles.badge, { backgroundColor: s.bg }]}><Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text></View>;
}

function UploadModal({
  row, driverId, onClose, onDone,
}: {
  row: DocRow | null; driverId: string; onClose: () => void; onDone: () => void;
}) {
  const { token } = useAuth();
  const [uri, setUri] = useState<string | null>(null);
  const [issuedAt, setIssuedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsExpiry = row?.definition.requiresExpiry ?? false;

  async function pick(mode: 'camera' | 'library') {
    setError(null);
    if (mode === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setError('Kamera izni gerekli'); return; }
      const r = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (!r.canceled && r.assets[0]) setUri(r.assets[0].uri);
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setError('Galeri izni gerekli'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (!r.canceled && r.assets[0]) setUri(r.assets[0].uri);
    }
  }

  async function upload() {
    if (!uri || !row) return;
    if (needsExpiry && (!issuedAt || !expiresAt)) { setError('Tarihler gerekli'); return; }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', { uri, name: `doc-${Date.now()}.jpg`, type: 'image/jpeg' } as any);
      form.append('definitionId', row.definition.id);
      if (issuedAt) form.append('issuedAt', issuedAt);
      if (expiresAt) form.append('expiresAt', expiresAt);
      const res = await fetch(`${API_URL}/me/drivers/${driverId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error(JSON.parse(await res.text())?.message ?? `HTTP ${res.status}`);
      setUri(null); setIssuedAt(''); setExpiresAt('');
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={!!row} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ums.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={ums.sheet}>
            <View style={ums.grabber} />
            <View style={ums.headerRow}>
              <Text style={ums.title}>{row?.definition.name}</Text>
              <Pressable onPress={onClose} hitSlop={12}><Text style={ums.close}>✕</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={ums.body} keyboardShouldPersistTaps="handled">
              <ErrorBanner message={error} />
              {!uri ? (
                <View style={ums.pickerRow}>
                  <Pressable style={ums.pickerBtn} onPress={() => pick('camera')}>
                    <Text style={ums.pickerBtnEmoji}>📷</Text>
                    <Text style={ums.pickerBtnText}>Kamera</Text>
                  </Pressable>
                  <Pressable style={ums.pickerBtn} onPress={() => pick('library')}>
                    <Text style={ums.pickerBtnEmoji}>🖼️</Text>
                    <Text style={ums.pickerBtnText}>Galeri</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={ums.previewBox}>
                  <Text style={ums.previewText}>✓ Dosya seçildi</Text>
                  <Pressable onPress={() => setUri(null)}><Text style={ums.previewClear}>Değiştir</Text></Pressable>
                </View>
              )}
              {needsExpiry && (
                <>
                  <DateField label="Veriliş Tarihi" value={issuedAt} onChange={setIssuedAt} />
                  <DateField label="Bitiş Tarihi" value={expiresAt} onChange={setExpiresAt} />
                </>
              )}
              <Button label={loading ? 'Yükleniyor...' : 'Yükle'} onPress={upload} loading={loading} disabled={!uri} style={{ marginTop: 12 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const ums = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  grabber: { width: 40, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark, flex: 1 },
  close: { fontSize: 20, color: colors.muted, fontWeight: '700' },
  body: { padding: 20 },
  pickerRow: { flexDirection: 'row', gap: 10 },
  pickerBtn: { flex: 1, padding: 20, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 6 },
  pickerBtnEmoji: { fontSize: 32 },
  pickerBtnText: { fontSize: 13, fontWeight: '700', color: colors.dark },
  previewBox: { padding: 20, backgroundColor: colors.successSoft, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0', alignItems: 'center', gap: 8 },
  previewText: { fontSize: 14, fontWeight: '800', color: '#065F46' },
  previewClear: { fontSize: 12, color: '#065F46', fontWeight: '700', textDecorationLine: 'underline' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  back: { padding: 6, width: 32 },
  backText: { fontSize: 24, color: colors.dark },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, gap: 10 },
  hero: { alignItems: 'center', padding: 20, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 6 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.blue + '22', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.blue },
  name: { fontSize: 20, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  meta: { fontSize: 12, color: colors.muted },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  contactBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  contactBtnText: { fontSize: 12, color: colors.dark, fontWeight: '700' },
  progressBox: { padding: 14, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  progressNum: { fontSize: 22, fontWeight: '800', color: colors.dark },
  progressLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 3 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  docCard: { padding: 14, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  docTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  docName: { fontSize: 13, fontWeight: '800', color: colors.dark },
  docDesc: { fontSize: 11, color: colors.muted, marginTop: 3 },
  docExpiry: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  rejectBox: { padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' },
  rejectLabel: { fontSize: 10, fontWeight: '800', color: '#991B1B', textTransform: 'uppercase', letterSpacing: 0.5 },
  rejectText: { fontSize: 12, color: '#991B1B', marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  uploadBtn: { marginTop: 4, padding: 10, borderRadius: 10, backgroundColor: colors.dark, alignItems: 'center' },
  uploadBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  emptyBox: { padding: 20, alignItems: 'center' },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
