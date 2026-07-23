import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../theme/colors';

interface Props extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string;
  /** 10 haneli sadece rakam (5054453212) */
  value: string;
  /** 10 haneli sadece rakam callback */
  onChangeText: (digits: string) => void;
  hint?: string;
  error?: string | null;
}

function formatDisplay(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length <= 8) return `(${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}

export const PhoneField = forwardRef<TextInput, Props>(
  ({ label, value, onChangeText, hint, error, style, ...rest }, ref) => {
    return (
      <View style={styles.wrap}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={[styles.inputWrap, error && styles.inputError]}>
          <Text style={styles.prefix}>+90</Text>
          <TextInput
            ref={ref}
            {...rest}
            value={formatDisplay(value)}
            onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, 10))}
            placeholder="(5XX) XXX XX XX"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            maxLength={16}
            style={[styles.input, style]}
          />
        </View>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);
PhoneField.displayName = 'PhoneField';

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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 4,
  },
  inputError: { borderColor: colors.danger },
  prefix: {
    fontSize: 15,
    color: colors.dark,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.dark,
  },
  hint: { fontSize: 11, color: colors.muted, marginTop: 4 },
  error: { fontSize: 11, color: colors.danger, marginTop: 4, fontWeight: '600' },
});
