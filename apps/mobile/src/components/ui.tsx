import { forwardRef } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  type TextInputProps,
  type PressableProps,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({
  label,
  loading,
  disabled,
  variant = 'primary',
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const styleMap = {
    primary: [buttonStyles.base, buttonStyles.primary, isDisabled && buttonStyles.primaryDisabled],
    secondary: [buttonStyles.base, buttonStyles.secondary, isDisabled && buttonStyles.secondaryDisabled],
    ghost: [buttonStyles.base, buttonStyles.ghost, isDisabled && buttonStyles.ghostDisabled],
  } as const;
  const textStyleMap = {
    primary: buttonStyles.primaryText,
    secondary: buttonStyles.secondaryText,
    ghost: buttonStyles.ghostText,
  } as const;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={(state) => [
        ...styleMap[variant],
        typeof style === 'function' ? style(state) : style,
        state.pressed && !isDisabled && buttonStyles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.dark} />
      ) : (
        <Text style={textStyleMap[variant]}>{label}</Text>
      )}
    </Pressable>
  );
}

const buttonStyles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: colors.dark,
  },
  primaryDisabled: {
    backgroundColor: colors.borderStrong,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  secondaryDisabled: {
    opacity: 0.5,
  },
  secondaryText: {
    color: colors.dark,
    fontWeight: '700',
    fontSize: 14,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostDisabled: {
    opacity: 0.5,
  },
  ghostText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
  },
});

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, style, ...rest }, ref) => {
    return (
      <View style={inputStyles.wrap}>
        {label ? <Text style={inputStyles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          {...rest}
          style={[
            inputStyles.input,
            error && inputStyles.inputError,
            style,
          ]}
        />
        {error ? (
          <Text style={inputStyles.error}>{error}</Text>
        ) : hint ? (
          <Text style={inputStyles.hint}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);
Input.displayName = 'Input';

const inputStyles = StyleSheet.create({
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
    paddingVertical: 12,
    fontSize: 15,
    color: colors.dark,
  },
  inputError: {
    borderColor: colors.danger,
  },
  hint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
  error: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '600',
  },
});

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={bannerStyles.err}>
      <Text style={bannerStyles.errText}>{message}</Text>
    </View>
  );
}

export function InfoBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={bannerStyles.info}>
      <Text style={bannerStyles.infoText}>{message}</Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  err: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
  },
  info: {
    backgroundColor: colors.successSoft,
    borderColor: '#A7F3D0',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  infoText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
  },
});
