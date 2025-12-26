import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { CaloriesTotalBurned, CalorieExpenditureItem, Goal, IosHealthTracker } from './models';

export function makeDatabase() {
  const adapter = new SQLiteAdapter({
    schema,
    onSetUpError: (error) => {
      // eslint-disable-next-line no-console
      console.error('[watermelondb] adapter setup error', error);
    },
  });

  return new Database({
    adapter,
    modelClasses: [CaloriesTotalBurned, IosHealthTracker, CalorieExpenditureItem, Goal],
  });
}


