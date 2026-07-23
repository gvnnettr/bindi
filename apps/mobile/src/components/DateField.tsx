import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';

interface Props {
  label: string;
  value: string; // 'YYYY-MM-DD'
  onChange: (v: string) => void;
  hint?: string;
  error?: string | null;
  placeholder?: string;
}

function toDate(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
  return new Date();
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function humanFmt(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function DateField({ label, value, onChange, hint, error, placeholder }: Props) {
  const [visible, setVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(toDate(value));

  function onNativeChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setVisible(false);
      if (event.type === 'set' && date) {
        onChange(fmt(date));
      }
      return;
    }
    if (date) setTempDate(date);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => {
          setTempDate(value ? toDate(value) : new Date());
          setVisible(true);
        }}
        style={[styles.input, error && styles.inputError]}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? humanFmt(value) : (placeholder ?? 'Tarih seç')}
        </Text>
        <Text style={styles.chev}>📅</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {Platform.OS === 'ios' && (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={() => setVisible(false)}>
          <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setVisible(false)}>
                  <Text style={styles.cancel}>Vazgeç</Text>
                </Pressable>
                <Text style={styles.sheetTitle}>{label}</Text>
                <Pressable onPress={() => { onChange(fmt(tempDate)); setVisible(false); }}>
                  <Text style={styles.done}>Tamam</Text>
                </Pressable>
              </View>
              <DateTimePicker
                mode="date"
                display="spinner"
                value={tempDate}
                locale="tr-TR"
                onChange={onNativeChange}
                style={{ backgroundColor: '#fff' }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
      {Platform.OS === 'android' && visible && (
        <DateTimePicker
          mode="date"
          display="calendar"
          value={tempDate}
          onChange={onNativeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: { borderColor: colors.danger },
  value: { fontSize: 15, color: colors.dark, fontWeight: '600' },
  placeholder: { color: colors.muted, fontWeight: '500' },
  chev: { fontSize: 16 },
  hint: { fontSize: 11, color: colors.muted, marginTop: 4 },
  error: { fontSize: 11, color: colors.danger, marginTop: 4, fontWeight: '600' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: 14, fontWeight: '800', color: colors.dark },
  cancel: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  done: { color: colors.dark, fontSize: 14, fontWeight: '800' },
});
