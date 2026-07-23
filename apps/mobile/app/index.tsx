import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/state/auth';
import { storage } from '../src/state/storage';
import { colors } from '../src/theme/colors';

export default function SplashRouter() {
  const { ready, role, token } = useAuth();

  useEffect(() => {
    if (!ready) return;
    (async () => {
      if (role && token) {
        router.replace(role === 'provider' ? '/(app)/servisci' : '/(app)/veli');
        return;
      }
      const onboarded = await storage.get(storage.KEYS.onboardingDone);
      router.replace(onboarded ? '/(auth)/rol' : '/onboarding');
    })();
  }, [ready, role, token]);

  return (
    <LinearGradient
      colors={['#FFE28A', colors.primary, '#E1A800']}
      locations={[0, 0.45, 1]}
      start={{ x: 0.3, y: 0.25 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.logoCard}>
        <Image
          source={require('../assets/bindi-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <ActivityIndicator style={styles.spinner} color="rgba(31,41,55,0.5)" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCard: {
    width: 260,
    height: 180,
    backgroundColor: '#fff',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  spinner: {
    marginTop: 40,
  },
});
