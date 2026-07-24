import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import type { Role } from '../state/auth';

const KEY_PHONE = 'auth:saved:phone';
const KEY_PASSWORD = 'auth:saved:password';
const KEY_ROLE = 'auth:saved:role';
const KEY_ENABLED = 'auth:saved:biometric_enabled';

export interface SavedCredentials {
  phone: string;
  password: string;
  role: Role;
}

/**
 * Cihazda biyometrik (Face ID / Touch ID) donanımı ve kayıtlı yüz/parmak izi var mı?
 */
export async function isBiometricSupported(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

/**
 * Kullanıcı biyometrik girişi bir kez etkinleştirdi mi?
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(KEY_ENABLED);
    return v === '1';
  } catch {
    return false;
  }
}

export async function saveCredentials(input: SavedCredentials): Promise<void> {
  await SecureStore.setItemAsync(KEY_PHONE, input.phone);
  await SecureStore.setItemAsync(KEY_PASSWORD, input.password);
  await SecureStore.setItemAsync(KEY_ROLE, input.role);
  await SecureStore.setItemAsync(KEY_ENABLED, '1');
}

export async function loadCredentials(): Promise<SavedCredentials | null> {
  try {
    const phone = await SecureStore.getItemAsync(KEY_PHONE);
    const password = await SecureStore.getItemAsync(KEY_PASSWORD);
    const role = await SecureStore.getItemAsync(KEY_ROLE);
    if (!phone || !password || !role) return null;
    return { phone, password, role: role as Role };
  } catch {
    return null;
  }
}

export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_PHONE);
  await SecureStore.deleteItemAsync(KEY_PASSWORD);
  await SecureStore.deleteItemAsync(KEY_ROLE);
  await SecureStore.deleteItemAsync(KEY_ENABLED);
}

/**
 * Biyometrik prompt aç, başarılıysa true döner.
 */
export async function authenticate(reason: string = 'Uygulamaya giriş yap'): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'İptal',
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}
