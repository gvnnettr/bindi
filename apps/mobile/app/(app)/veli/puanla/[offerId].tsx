import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../../src/api/client';
import { useAuth } from '../../../../src/state/auth';
import { Button, ErrorBanner, Input } from '../../../../src/components/ui';
import { colors } from '../../../../src/theme/colors';

const RATING_LABELS: Record<number, string> = {
  1: 'Çok Kötü',
  2: 'Kötü',
  3: 'Orta',
  4: 'İyi',
  5: 'Mükemmel',
};

export default function PuanlaScreen() {
  const { offerId, companyName } = useLocalSearchParams<{ offerId: string; companyName?: string }>();
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (rating < 1 || rating > 5) {
      setError('Yıldız seç');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(
        `/me/parent/offers/${offerId}/review`,
        { rating, comment: comment.trim() || undefined },
        token,
      );
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Servisçiyi Puanla</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{companyName ?? 'Servisçin'} nasıldı?</Text>
            <Text style={styles.heroSub}>Deneyimini paylaş — diğer velilere yardımcı ol</Text>
          </View>

          <ErrorBanner message={error} />

          <View style={styles.starsBox}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)} hitSlop={4}>
                  <Text style={[styles.star, n <= rating && styles.starActive]}>★</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {rating > 0 ? RATING_LABELS[rating] : 'Yıldız seç'}
            </Text>
          </View>

          <Input
            label="Yorum (opsiyonel)"
            value={comment}
            onChangeText={setComment}
            placeholder="Deneyimini paylaş — servisçinin güçlü yanları, iyileştirmeler..."
            multiline
            numberOfLines={5}
            style={{ minHeight: 130, textAlignVertical: 'top' }}
            hint="Diğer veliler bu yorumları görecek"
          />

          <Button
            label={loading ? 'Gönderiliyor...' : 'Puanı Gönder'}
            onPress={submit}
            loading={loading}
            disabled={rating < 1}
            style={{ marginTop: 12 }}
          />

          <Text style={styles.note}>
            Puanını verdikten sonra değiştiremezsin. Yorum gönderdikten sonra Bindi ekibi moderasyon inceler.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  back: { padding: 6, width: 32 },
  backText: { fontSize: 24, color: colors.dark },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.dark },
  body: { padding: 24, flexGrow: 1 },
  hero: { marginBottom: 20 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  heroSub: { fontSize: 12, color: colors.muted, marginTop: 4 },
  starsBox: {
    padding: 24, backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', marginBottom: 20,
  },
  starsRow: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 50, color: colors.borderStrong },
  starActive: { color: colors.primary },
  ratingLabel: { fontSize: 14, fontWeight: '800', color: colors.dark, marginTop: 12, letterSpacing: -0.2 },
  note: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
