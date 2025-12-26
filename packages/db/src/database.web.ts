import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import { CaloriesTotalBurned, CalorieExpenditureItem, Goal, IosHealthTracker } from './models';

export function makeDatabase() {
  const adapter = new LokiJSAdapter({
    schema,
    dbName: 'calorie-tracker',
    useWebWorker: false,
    useIncrementalIndexedDB: true,
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


