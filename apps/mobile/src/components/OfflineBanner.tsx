import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../state/network';
import { colors } from '../theme/colors';

export function OfflineBanner() {
  const { online } = useNetworkStatus();
  if (online) return null;
  return (
    <SafeAreaView edges={['top']} style={styles.wrap}>
      <View style={styles.inner}>
        <Text style={styles.dot}>●</Text>
        <Text style={styles.text}>İnternet yok — güncel veri gösterilemiyor</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.dark,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dot: {
    color: colors.danger,
    fontSize: 8,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
