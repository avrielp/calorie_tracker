import React, { useMemo } from 'react';
import { DatabaseProvider } from '@nozbe/watermelondb/hooks';
import { makeDatabase } from '@calorie-tracker/db';

export function DbProvider({ children }: { children: React.ReactNode }) {
  const database = useMemo(() => makeDatabase(), []);
  return <DatabaseProvider database={database}>{children}</DatabaseProvider>;
}


