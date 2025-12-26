import type { Database } from '@nozbe/watermelondb';
import { syncNowImpl } from './syncImpl';
import { readLastPulledAt, writeLastPulledAt } from './syncStorage.native';

export async function syncNow(args: { database: Database; userId: string; getIdToken: () => Promise<string> }) {
  return syncNowImpl({ ...args, readLastPulledAt, writeLastPulledAt });
}


