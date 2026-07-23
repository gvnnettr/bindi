import Constants from 'expo-constants';

export const API_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ??
  'https://bindi.com.tr/api';
