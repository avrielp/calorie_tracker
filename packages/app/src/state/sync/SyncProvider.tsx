import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { syncNow } from '@calorie-tracker/db';
import { useAuth } from '../auth/AuthProvider';
import { devLog, devWarn } from '../log';

type SyncCtxValue = {
  requestSync: (reason?: string) => void;
};

const Ctx = createContext<SyncCtxValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const database = useDatabase();
  const { profile, getIdToken } = useAuth();
  const userId = profile?.userId ?? profile?.authUid ?? '';

  const isRunningRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestReasonRef = useRef<string | undefined>(undefined);

  const runNow = useCallback(
    async (why?: string) => {
      if (!userId) return;
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      try {
        devLog('[sync] start', { userId, why });
        await syncNow({ database, userId, getIdToken });
        devLog('[sync] done', { userId, why });
      } catch (e) {
        devWarn('[sync] failed', e);
      } finally {
        isRunningRef.current = false;
      }
    },
    [database, getIdToken, userId],
  );

  const requestSync = useCallback(
    (reason?: string) => {
      if (!userId) return;
      latestReasonRef.current = reason;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        runNow(latestReasonRef.current);
      }, 60 * 1000);
      devLog('[sync] scheduled', { inSeconds: 60, reason });
    },
    [runNow, userId],
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    runNow('mount');
    const interval = setInterval(() => {
      if (!cancelled) runNow('interval');
    }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    };
  }, [runNow, userId]);

  const value = useMemo(() => ({ requestSync }), [requestSync]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSync must be used within SyncProvider');
  return v;
}



