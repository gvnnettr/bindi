import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import Svg, { Path } from 'react-native-svg';
import { Button } from '../../src/components/ui';
import { storage } from '../../src/state/storage';
import { colors } from '../../src/theme/colors';

type Status = 'unknown' | 'granted' | 'denied';

export default function BildirimIzniScreen() {
  const [status, setStatus] = useState<Status>('unknown');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await messaging().hasPermission();
      apply(s);
    })();
  }, []);

  function apply(s: number) {
    const isGranted =
      s === messaging.AuthorizationStatus.AUTHORIZED ||
      s === messaging.AuthorizationStatus.PROVISIONAL;
    setStatus(isGranted ? 'granted' : 'denied');
    if (isGranted) {
      void storage.set(storage.KEYS.notificationsGranted, '1');
    }
  }

  async function request() {
    setLoading(true);
    try {
      const s = await messaging().requestPermission();
      apply(s);
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
          <Svg width={72} height={72} viewBox="0 0 24 24" fill="none" stroke={colors.blue} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
          </Svg>
        </View>

        <Text style={styles.title}>Bildirim izni</Text>
        <Text style={styles.sub}>
          Yeni talep, teklif kabulü, ödeme onayı gibi anlık gelişmeleri kaçırma. Kapalıyken bile bildirilirsin.
        </Text>

        <View style={styles.samples}>
          <Sample
            title="Yeni Talep"
            body="Karadeniz Mahallesi · İlkokul · aylık ₺2.500"
          />
          <Sample
            title="Teklifin Seçildi"
            body="Ali Öztürk sizi seçti. Ödeme bekleniyor."
          />
        </View>

        <View style={{ flex: 1 }} />

        {status === 'granted' ? (
          <View style={styles.grantedBox}>
            <Text style={styles.grantedTitle}>✓ Bildirim izni verildi</Text>
            <Text style={styles.grantedText}>Push mesajları alacaksın.</Text>
            <Button label="Tamam" onPress={() => router.back()} style={{ marginTop: 12 }} />
          </View>
        ) : (
          <>
            <Button label="Bildirimleri Aç" onPress={request} loading={loading} />
            <Button
              label={Platform.OS === 'ios' ? 'iOS Ayarlarını Aç' : 'Sistem Ayarlarını Aç'}
              variant="secondary"
              onPress={() => Linking.openSettings()}
              style={{ marginTop: 8 }}
            />
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

function Sample({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.sample}>
      <View style={styles.sampleIcon}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>b.</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sampleTitle}>{title}</Text>
        <Text style={styles.sampleBody} numberOfLines={1}>{body}</Text>
      </View>
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
    backgroundColor: colors.blueSoft,
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
  samples: { marginTop: 20, gap: 8 },
  sample: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sampleIcon: {
    width: 32,
    height: 32,
    backgroundColor: colors.dark,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleTitle: { fontSize: 13, fontWeight: '800', color: colors.dark },
  sampleBody: { fontSize: 12, color: colors.muted, marginTop: 1 },
  grantedBox: {
    padding: 16,
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  grantedTitle: { color: '#065F46', fontWeight: '800', fontSize: 14 },
  grantedText: { color: '#065F46', fontSize: 12, marginTop: 4 },
});
