import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../../src/state/auth';
import { colors } from '../../../src/theme/colors';

interface MenuItem {
  label: string;
  desc?: string;
  icon: React.ReactNode;
  onPress: () => void;
}

export default function VeliMenuScreen() {
  const { logout } = useAuth();

  const items: MenuItem[] = [
    {
      label: 'Aile Üyeleri',
      desc: 'Diğer velileri davet et',
      icon: <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
      onPress: () => router.push('/(app)/veli/aile-uyeleri'),
    },
    {
      label: 'Ayarlar',
      desc: 'Profil, e-posta, şifre',
      icon: <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />,
      onPress: () => router.push('/(app)/veli/ayarlar'),
    },
    {
      label: 'Bildirimler',
      desc: 'Push izin ve tercihler',
      icon: <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />,
      onPress: () => router.push('/izin/bildirim'),
    },
    {
      label: 'Yardım',
      desc: 'SSS, destek',
      icon: <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />,
      onPress: () => router.push('/(auth)/yardim'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Menü</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {items.map((item, i) => (
          <Pressable
            key={i}
            onPress={item.onPress}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          >
            <View style={styles.rowIcon}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.dark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              {item.desc && <Text style={styles.rowDesc}>{item.desc}</Text>}
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        ))}

        <Pressable
          onPress={async () => {
            await logout();
            router.replace('/');
          }}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 22, fontWeight: '800', color: colors.dark, letterSpacing: -0.3 },
  body: { padding: 20, gap: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 14, fontWeight: '700', color: colors.dark },
  rowDesc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  chev: { fontSize: 22, color: colors.muted, marginLeft: 8 },
  logoutBtn: {
    marginTop: 20, padding: 14,
    backgroundColor: '#FEF2F2', borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA',
    alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
});
