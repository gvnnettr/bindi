import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { api } from '../api/client';
import { useAuth } from '../state/auth';
import { colors } from '../theme/colors';

interface Props {
  color?: string;
  size?: number;
}

/**
 * Bildirim çanı: sayfa header'larında sağ üstte.
 * Okunmamış sayısını 30 saniyede bir yeniler.
 * Tıklayınca /bildirimler ekranına gider.
 */
export function NotificationBell({ color = colors.dark, size = 22 }: Props) {
  const { token } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<{ count: number }>('/me/notifications/unread-count', token);
      setCount(r.count ?? 0);
    } catch {}
  }, [token]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    const id = setInterval(() => { void refresh(); }, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <Pressable
      onPress={() => router.push('/(app)/bildirimler')}
      hitSlop={12}
      style={styles.wrap}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </Svg>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
