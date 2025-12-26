import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';

export function createAdapter() {
  return new SQLiteAdapter({
    schema,
    // migrations, if/when we add them
    onSetUpError: (error) => {
      // eslint-disable-next-line no-console
      console.error('[watermelondb] adapter setup error', error);
    },
  });
}


