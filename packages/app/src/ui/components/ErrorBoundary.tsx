import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  { error: any }
> {
  state = { error: null as any };

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any) {
    // eslint-disable-next-line no-console
    console.error('[ui] ErrorBoundary caught', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.title}>{this.props.label ?? 'Something went wrong'}</Text>
        <ScrollView style={styles.box} contentContainerStyle={{ padding: 12 }}>
          <Text style={styles.mono}>{String(this.state.error?.stack ?? this.state.error)}</Text>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },
  title: { color: colors.danger, fontSize: 16, fontWeight: '900' },
  box: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#0E1016' },
  mono: { color: colors.text, fontFamily: 'ui-monospace', fontSize: 12, lineHeight: 16 },
});


