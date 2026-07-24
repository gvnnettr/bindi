import { Stack } from 'expo-router';

/**
 * Stack layout for provider (servisçi) area.
 * Nested tabs are under (tabs)/. Screens outside (tabs)/ are pushed
 * on top of the stack — 'geri' button pops back correctly (not to home).
 */
export default function ServisciStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
