import { useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/client';
import { useAuth, type Role } from '../state/auth';

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
      let messaging: typeof import('@react-native-firebase/messaging').default;
      try {
        // Lazy import — crash olursa senkron başlangıçta değil burada olsun
        messaging = (await import('@react-native-firebase/messaging')).default;
      } catch (e) {
        console.warn('Firebase messaging import failed', e);
        return;
      }

      try {
        if (Platform.OS === 'ios') {
          const s = await messaging().requestPermission();
          const granted =
            s === messaging.AuthorizationStatus.AUTHORIZED ||
            s === messaging.AuthorizationStatus.PROVISIONAL;
          if (!granted) return;
        }
        const fcm = await messaging().getToken();
        if (cancelled) return;
        currentFcmToken = fcm;
        await api.post(
          pathFor(role, 'register'),
          {
            token: fcm,
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
          },
          authToken,
        );
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
        console.warn('FCM setup failed', e);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubTokenRefresh) unsubTokenRefresh();
    };
  }, [role, authToken]);
}
