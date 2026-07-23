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

export default function MenuScreen() {
  const { logout } = useAuth();

  const items: MenuItem[] = [
    {
      label: 'Öğrencilerim',
      desc: 'Aktif servis kayıtları · Takip',
      icon: <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />,
      onPress: () => router.push('/(app)/servisci/ogrencilerim'),
    },
    {
      label: 'Şoförlerim',
      desc: 'Sürücü ve belge yönetimi · Takip',
      icon: <Path d="M8 21v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />,
      onPress: () => router.push('/(app)/servisci/soforlerim'),
    },
    {
      label: 'Kazançlarım',
      desc: 'Aylık ciro, stat, puan özet',
      icon: <Path d="M3 3v18h18M7 13l3-3 4 4 6-6" />,
      onPress: () => router.push('/(app)/servisci/kazanclarim'),
    },
    {
      label: 'Tekliflerim',
      desc: 'Verdiğim tekliflerin durumu',
      icon: <Path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />,
      onPress: () => router.push('/(app)/servisci/tekliflerim'),
    },
    {
      label: 'Şirket Belgelerim',
      desc: 'Vergi levhası, K belgesi vs.',
      icon: <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />,
      onPress: () => router.push('/(app)/servisci/belgelerim'),
    },
    {
      label: 'Puanlarım',
      desc: 'Veli değerlendirmeleri',
      icon: <Path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />,
      onPress: () => router.push('/(app)/servisci/puanlarim'),
    },
    {
      label: 'Ayarlar',
      desc: 'Firma bilgileri, şifre',
      icon: <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />,
      onPress: () => router.push('/(app)/servisci/ayarlar'),
    },
    {
      label: 'Yardım',
      desc: 'SSS, destek',
      icon: <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />,
      onPress: () => router.push('/(auth)/yardim'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
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
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.dark, letterSpacing: -0.3 },
  body: { padding: 20, gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 14, fontWeight: '700', color: colors.dark },
  rowDesc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  chev: { fontSize: 22, color: colors.muted, marginLeft: 8 },
  logoutBtn: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
});
