import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
  Image,
  type ViewToken,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage } from '../src/state/storage';
import { colors } from '../src/theme/colors';

interface Slide {
  title: string;
  subtitle?: string;
  body: string;
  icon: 'logo' | 'family' | 'bus';
  ctaLabel: string;
}

const SLIDES: Slide[] = [
  {
    title: 'bindi.',
    subtitle: 'Okul servisi kolaylaştı.',
    body: 'Veliler tek talepte teklif alır, servisçiler bölgede işlerini büyütür. Aynı uygulamada iki taraf, tek amaç.',
    icon: 'logo',
    ctaLabel: 'Devam',
  },
  {
    title: 'Veli isen',
    subtitle: 'Fiyatları karşılaştır.',
    body: 'Bölgende çalışan tüm servisçilerden anında teklif al. Puanları, aracı, aylık ücreti gör; en uygun olanı sen seç.',
    icon: 'family',
    ctaLabel: 'Devam',
  },
  {
    title: 'Servisçi isen',
    subtitle: 'İşlerini büyüt.',
    body: 'Talepler telefonuna düşer, teklif ver, kazandığın işlerin öğrenci ve ödemelerini tek yerden yönet.',
    icon: 'bus',
    ctaLabel: 'Başla',
  },
];

function IconCardContent({ kind }: { kind: Slide['icon'] }) {
  if (kind === 'logo') {
    return (
      <Image
        source={require('../assets/bindi-logo.png')}
        style={styles.cardLogo}
        resizeMode="contain"
      />
    );
  }
  if (kind === 'family') {
    return (
      <Svg width={80} height={80} viewBox="0 0 24 24" fill="none" stroke={colors.dark} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <Circle cx="12" cy="7" r="4" />
      </Svg>
    );
  }
  return (
    <Svg width={80} height={80} viewBox="0 0 24 24" fill="none" stroke={colors.dark} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="6" width="18" height="12" rx="3" />
      <Path d="M3 12h18" />
      <Path d="M7 18v2M17 18v2" />
      <Circle cx="7" cy="15" r="0.6" fill={colors.dark} />
      <Circle cx="17" cy="15" r="0.6" fill={colors.dark} />
    </Svg>
  );
}

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  async function finish() {
    await storage.set(storage.KEYS.onboardingDone, '1');
    router.replace('/(auth)/rol');
  }

  function next() {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  });

  return (
    <LinearGradient
      colors={['#FFE28A', colors.primary, '#E1A800']}
      locations={[0, 0.45, 1]}
      start={{ x: 0.3, y: 0.25 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView edges={['top']} style={styles.topRow}>
        <View />
        <Pressable onPress={finish} hitSlop={12} style={styles.skipButton}>
          <Text style={styles.skipText}>Atla</Text>
        </Pressable>
      </SafeAreaView>

      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        onViewableItemsChanged={onViewable.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View
              style={[
                styles.iconCard,
                item.icon === 'logo' && styles.iconCardWide,
              ]}
            >
              <IconCardContent kind={item.icon} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <Pressable style={styles.cta} onPress={next}>
          <Text style={styles.ctaText}>{SLIDES[index].ctaLabel}</Text>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  skipButton: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark,
  },
  slide: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCard: {
    width: 140,
    height: 140,
    backgroundColor: '#fff',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  iconCardWide: {
    width: 240,
    height: 160,
    padding: 16,
  },
  cardLogo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.dark,
    marginTop: 28,
    letterSpacing: -1,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    marginTop: 6,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 13,
    color: 'rgba(31,41,55,0.72)',
    marginTop: 12,
    maxWidth: 320,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 18,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.dark,
  },
  cta: {
    width: '100%',
    backgroundColor: colors.dark,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});
