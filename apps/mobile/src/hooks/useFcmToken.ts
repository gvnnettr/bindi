import { useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from '../api/client';
import { useAuth, type Role } from '../state/auth';

// DEBUG MODU: her adimda gorunur bilgi
const DEBUG_PUSH = true;
function debug(msg: string) {
  if (DEBUG_PUSH) Alert.alert('Push Debug', msg);
  console.warn('[push]', msg);
}

function pathFor(role: Role, action: 'register' | 'unregister'): string {
  const base = role === 'provider' ? '/me/push' : '/parent/push';
  return `${base}/mobile/${action}`;
}

export function useFcmToken() {
  const { role, token: authToken } = useAuth();

  useEffect(() => {
    if (!role || !authToken) return;
    let currentFcmToken: string | null = null;
    let unsubTokenRefresh: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      debug(`1) baslatildi role=${role}`);
      try {
        const existing = await Notifications.getPermissionsAsync();
        let status = existing.status;
        debug(`2) izin=${status}`);
        if (status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: true, allowSound: true },
          });
          status = req.status;
          debug(`2b) izin sonrasi=${status}`);
        }
        if (status !== 'granted') {
          debug(`DUR: izin verilmedi (${status})`);
          return;
        }
      } catch (e) {
        debug(`HATA izin: ${(e as Error).message}`);
        return;
      }

      let messaging: typeof import('@react-native-firebase/messaging').default;
      try {
        messaging = (await import('@react-native-firebase/messaging')).default;
        debug('3) firebase import OK');
      } catch (e) {
        debug(`HATA import: ${(e as Error).message}`);
        return;
      }

      try {
        if (Platform.OS === 'ios') {
          debug(`4) APNs register basliyor (once=${messaging().isDeviceRegisteredForRemoteMessages})`);
          await messaging().registerDeviceForRemoteMessages();
          await new Promise((r) => setTimeout(r, 1500));
          debug('4b) APNs register bitti, 1500ms beklendi');
        }
        const fcm = await messaging().getToken();
        if (cancelled) return;
        if (!fcm) {
          debug('DUR: getToken null dondu');
          return;
        }
        debug(`5) FCM token alindi: ${fcm.substring(0, 20)}...`);
        currentFcmToken = fcm;
        await api.post(
          pathFor(role, 'register'),
          {
            token: fcm,
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
          },
          authToken,
        );
        debug('6) Backend POST OK — tamamlandi!');
        unsubTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
          if (!newToken || newToken === currentFcmToken) return;
          currentFcmToken = newToken;
          try {
            await api.post(
              pathFor(role, 'register'),
              {
                token: newToken,
                platform: Platform.OS === 'ios' ? 'ios' : 'android',
              },
              authToken,
            );
          } catch (e) {
            console.warn('FCM refresh register failed', e);
          }
        });
      } catch (e) {
        debug(`HATA FCM: ${(e as Error).message}`);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubTokenRefresh) unsubTokenRefresh();
    };
  }, [role, authToken]);
}
