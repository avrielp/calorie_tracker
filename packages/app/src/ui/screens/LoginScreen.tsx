import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../state/auth/AuthProvider';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme';

export function LoginScreen() {
  const { signIn } = useAuth();

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Calorie Tracker</Text>
        <Text style={styles.subtitle}>Sign in to sync your data across devices.</Text>
        <PrimaryButton title="Continue with Google" onPress={() => signIn()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 20 },
  card: {
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: 6 },
});


