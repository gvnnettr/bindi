import { Component, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.warn('AppErrorBoundary caught:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Uygulama başlatılırken hata</Text>
          <Text style={styles.msg}>{this.state.error.message}</Text>
          {this.state.error.stack ? (
            <Text style={styles.stack}>{this.state.error.stack}</Text>
          ) : null}
          <Text style={styles.hint}>
            Bu ekran geçicidir — hatayı bize ilet: destek@bindi.com.tr
          </Text>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingTop: 60 },
  scroll: { padding: 24 },
  title: { fontSize: 18, fontWeight: '800', color: colors.danger },
  msg: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
  },
  stack: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.muted,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  hint: {
    marginTop: 20,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
});
