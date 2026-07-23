import { Stack } from 'expo-router';
import { useFcmToken } from '../../src/hooks/useFcmToken';
import { colors } from '../../src/theme/colors';

export default function AppLayout() {
  useFcmToken();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
