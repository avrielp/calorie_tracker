import AsyncStorage from '@react-native-async-storage/async-storage';

const keyForUser = (userId: string) => `wmdb:lastPulledAt:${userId}`;

export async function readLastPulledAt(userId: string): Promise<number | null> {
  const raw = await AsyncStorage.getItem(keyForUser(userId));
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export async function writeLastPulledAt(userId: string, timestamp: number): Promise<void> {
  await AsyncStorage.setItem(keyForUser(userId), String(timestamp));
}


