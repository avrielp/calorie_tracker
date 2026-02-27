import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../state/auth/AuthProvider';
import { colors } from '../theme';
import { SectionCard } from '../components/SectionCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Row } from '../components/Row';
import { AvatarCircle } from '../components/AvatarCircle';
import { getLastSyncAt } from '@calorie-tracker/db';

export function SettingsScreen() {
  const { profile, firebaseUser, signOut } = useAuth();
  const name = profile?.name ?? firebaseUser?.displayName ?? 'User';
  const photoURL = profile?.photoURL ?? firebaseUser?.photoURL ?? undefined;
  const userId = profile?.userId ?? '';

  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) return;
      const ts = await getLastSyncAt(userId);
      if (!cancelled) setLastSyncAt(ts);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return 'Never';
    try {
      return new Date(lastSyncAt).toLocaleString();
    } catch {
      return String(lastSyncAt);
    }
  }, [lastSyncAt]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AvatarCircle size={44} name={name} photoURL={photoURL} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{profile?.email ?? firebaseUser?.email ?? ''}</Text>
        </View>
      </View>

      <SectionCard title="Profile">
        <Row label="User ID" value={userId} />
        <Row label="Last sync" value={lastSyncLabel} />
      </SectionCard>

      <SectionCard title="Account">
        <PrimaryButton title="Sign out" onPress={() => signOut()} />
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
  },
  name: { color: colors.text, fontSize: 18, fontWeight: '900' },
  email: { color: colors.muted, marginTop: 2 },
});


