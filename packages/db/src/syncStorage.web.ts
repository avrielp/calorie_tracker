const keyForUser = (userId: string) => `wmdb:lastPulledAt:${userId}`;

export async function readLastPulledAt(userId: string): Promise<number | null> {
  const raw = globalThis.localStorage?.getItem(keyForUser(userId));
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export async function writeLastPulledAt(userId: string, timestamp: number): Promise<void> {
  globalThis.localStorage?.setItem(keyForUser(userId), String(timestamp));
}


