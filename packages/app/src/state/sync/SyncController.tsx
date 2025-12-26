import React, { useEffect, useRef } from 'react';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { syncNow } from '@calorie-tracker/db';
import { useAuth } from '../auth/AuthProvider';

export function SyncController() {
  const database = useDatabase();
  const { profile, getIdToken } = useAuth();
  const userId = profile?.userId ?? profile?.authUid ?? '';
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const run = async () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      try {
        await syncNow({ database, userId, getIdToken });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[sync] failed', e);
      } finally {
        isRunningRef.current = false;
      }
    };

    run();
    const interval = setInterval(() => {
      if (!cancelled) run();
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [database, getIdToken, userId]);

  return null;
}


