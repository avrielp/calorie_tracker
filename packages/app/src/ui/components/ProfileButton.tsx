import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../state/auth/AuthProvider';
import { colors } from '../theme';

export function ProfileButton({ onPress }: { onPress: () => void }) {
  const { profile, firebaseUser } = useAuth();
  const name = profile?.name ?? firebaseUser?.displayName ?? 'User';
  const photoURL = profile?.photoURL ?? firebaseUser?.photoURL ?? undefined;

  return (
    <Pressable onPress={onPress} style={styles.btn} hitSlop={8}>
      {photoURL ? (
        <Image source={{ uri: photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarFallbackText}>{(name?.[0] ?? 'U').toUpperCase()}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 12, paddingVertical: 6 },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  avatarFallback: {
    backgroundColor: '#1A2030',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { color: colors.text, fontWeight: '800' },
});

