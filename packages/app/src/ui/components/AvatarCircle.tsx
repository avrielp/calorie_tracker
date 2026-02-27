import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function AvatarCircle({
  size,
  name,
  photoURL,
}: {
  size: number;
  name: string;
  photoURL?: string | null;
}) {
  const [failed, setFailed] = useState(false);

  const normalizedUrl = useMemo(() => {
    const s = String(photoURL ?? '').trim();
    return s.length > 0 ? s : '';
  }, [photoURL]);

  useEffect(() => {
    setFailed(false);
  }, [normalizedUrl]);

  const initial = (name?.trim()?.[0] ?? 'U').toUpperCase();

  if (normalizedUrl && !failed) {
    return (
      <Image
        source={{ uri: normalizedUrl }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        onError={(e) => {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('[avatar] image load failed', {
              uri: normalizedUrl,
              nativeEvent: (e as any)?.nativeEvent,
            });
          }
          setFailed(true);
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, borderColor: colors.border },
      ]}
    >
      <Text style={styles.fallbackText}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {},
  fallback: {
    backgroundColor: '#1A2030',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: { color: colors.text, fontWeight: '900' },
});

