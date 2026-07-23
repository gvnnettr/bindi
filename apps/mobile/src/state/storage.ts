import * as SecureStore from 'expo-secure-store';

const KEYS = {
  providerToken: 'servis.provider.token',
  parentToken: 'servis.parent.token',
  role: 'servis.role',
  onboardingDone: 'servis.onboarding.done',
  locationGranted: 'servis.perm.location',
  notificationsGranted: 'servis.perm.notifications',
} as const;

export const storage = {
  KEYS,
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async del(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};
