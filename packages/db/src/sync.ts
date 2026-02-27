import type { Database } from '@nozbe/watermelondb';

export async function syncNow(_args: {
  database: Database;
  userId: string;
  getIdToken: () => Promise<string>;
}): Promise<never> {
  throw new Error(
    'Platform sync entrypoint not resolved. Import @calorie-tracker/db from React Native (uses `react-native` field) or Web bundler (uses `browser` field).',
  );
}


