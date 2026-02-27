import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../state/auth/AuthProvider';
import { AvatarCircle } from './AvatarCircle';

export function ProfileButton({ onPress }: { onPress: () => void }) {
  const { profile, firebaseUser } = useAuth();
  const name = profile?.name ?? firebaseUser?.displayName ?? 'User';
  const photoURL = profile?.photoURL ?? firebaseUser?.photoURL ?? undefined;

  return (
    <Pressable onPress={onPress} style={styles.btn} hitSlop={8}>
      <AvatarCircle size={30} name={name} photoURL={photoURL} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 12, paddingVertical: 6 },
});

