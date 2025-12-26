import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';

export function createAdapter() {
  return new LokiJSAdapter({
    schema,
    dbName: 'calorie-tracker',
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    onSetUpError: (error) => {
      // eslint-disable-next-line no-console
      console.error('[watermelondb] adapter setup error', error);
    },
  });
}


