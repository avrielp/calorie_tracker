import { readLastPulledAt } from './syncStorage.native';

export async function getLastSyncAt(userId: string): Promise<number | null> {
  if (!userId) return null;
  return readLastPulledAt(userId);
}

