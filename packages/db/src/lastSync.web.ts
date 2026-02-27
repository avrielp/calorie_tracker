import { readLastPulledAt } from './syncStorage.web';

export async function getLastSyncAt(userId: string): Promise<number | null> {
  if (!userId) return null;
  return readLastPulledAt(userId);
}

