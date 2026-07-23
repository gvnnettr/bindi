import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Svg, { Circle, Path } from 'react-native-svg';
import { Button } from '../../src/components/ui';
import { storage } from '../../src/state/storage';
import { colors } from '../../src/theme/colors';

type Status = 'unknown' | 'granted' | 'denied' | 'blocked';

export default function KonumIzniScreen() {
  const [status, setStatus] = useState<Status>('unknown');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await Location.getForegroundPermissionsAsync();
      updateFrom(p);
    })();
  }, []);

  function updateFrom(p: Location.LocationPermissionResponse) {
    if (p.status === 'granted') {
      setStatus('granted');
      void storage.set(storage.KEYS.locationGranted, '1');
      return;
    }
    if (!p.canAskAgain) {
      setStatus('blocked');
      return;
    }
    setStatus('denied');
  }

  async function request() {
    setLoading(true);
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      updateFrom(p);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>

        <View style={styles.iconBox}>
          <Svg width={72} height={72} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <Circle cx="12" cy="10" r="3" />
          </Svg>
        </View>

        <Text style={styles.title}>Konum izni</Text>
        <Text style={styles.sub}>
          Servis başlat/bitir sırasında velilere anlık konumu göstermek için gereklidir. Servis dışında konum takip edilmez.
        </Text>

        <View style={styles.bullets}>
          <Bullet text="Sadece servis aktifken çalışır" />
          <Bullet text="Servis bittiğinde otomatik durur" />
          <Bullet text="Arka planda pasif konum toplanmaz" />
        </View>

        <View style={{ flex: 1 }} />

        {status === 'granted' ? (
          <View style={styles.grantedBox}>
            <Text style={styles.grantedTitle}>✓ Konum izni verildi</Text>
            <Text style={styles.grantedText}>Servis başlatınca konum otomatik paylaşılır.</Text>
            <Button label="Tamam" onPress={() => router.back()} style={{ marginTop: 12 }} />
          </View>
        ) : status === 'blocked' ? (
          <View>
            <Text style={styles.blockedText}>
              Konum izni engellendi. Ayarlar &gt; Bindi &gt; Konum bölümünden aç.
            </Text>
            <Button
              label="Ayarları Aç"
              onPress={() => Linking.openSettings()}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : (
          <>
            <Button label="Konum İznini Ver" onPress={request} loading={loading} />
            <Button
              label="Şimdi Değil"
              variant="ghost"
              onPress={() => router.back()}
              style={{ marginTop: 6 }}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, padding: 24 },
  back: { marginBottom: 12 },
  backText: { fontSize: 24, color: colors.dark },
  iconBox: {
    width: 120,
    height: 120,
    backgroundColor: colors.primarySoft,
    borderRadius: 30,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.dark,
    marginTop: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 8,
    lineHeight: 19,
    textAlign: 'center',
  },
  bullets: { marginTop: 24, gap: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: { color: colors.success, fontSize: 13, fontWeight: '800' },
  bulletText: { color: colors.dark, fontSize: 13 },
  grantedBox: {
    padding: 16,
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  grantedTitle: { color: '#065F46', fontWeight: '800', fontSize: 14 },
  grantedText: { color: '#065F46', fontSize: 12, marginTop: 4 },
  blockedText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
});
