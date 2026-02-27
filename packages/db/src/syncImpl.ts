import type { Database } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import { getRuntimeConfig } from '@calorie-tracker/core';

export type SyncDeps = {
  database: Database;
  userId: string;
  getIdToken: () => Promise<string>;
  readLastPulledAt: (userId: string) => Promise<number | null>;
  writeLastPulledAt: (userId: string, timestamp: number) => Promise<void>;
};

export async function syncNowImpl({
  database,
  userId,
  getIdToken,
  readLastPulledAt,
  writeLastPulledAt,
}: SyncDeps) {
  const cfg = getRuntimeConfig();
  if (!cfg.backendBaseUrl) throw new Error('Missing BACKEND_BASE_URL runtime config');
  if (!cfg.backendApiKey) throw new Error('Missing BACKEND_API_KEY runtime config');

  const token = await getIdToken();
  const lastPulledAt = await readLastPulledAt(userId);
  let newTimestamp: number | null = null;

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt: lpa }) => {
      const since = lpa ?? 0;
      const res = await fetch(
        `${cfg.backendBaseUrl}/sync/pull?userId=${encodeURIComponent(userId)}&since=${since}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-api-key': cfg.backendApiKey,
          },
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`pullChanges failed: ${res.status} ${text}`);
      }
      const json = await res.json();
      newTimestamp = typeof json?.timestamp === 'number' ? json.timestamp : null;
      return json;
    },
    pushChanges: async ({ changes, lastPulledAt: lpa }) => {
      const res = await fetch(`${cfg.backendBaseUrl}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-api-key': cfg.backendApiKey,
        },
        body: JSON.stringify({ userId, changes, lastPulledAt: lpa ?? 0 }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`pushChanges failed: ${res.status} ${text}`);
      }
    },
  });

  if (newTimestamp == null) {
    throw new Error('pullChanges response missing `timestamp`');
  }
  await writeLastPulledAt(userId, newTimestamp);
  return { timestamp: newTimestamp, lastPulledAt };
}


