export async function getLastSyncAt(_userId: string): Promise<never> {
  throw new Error(
    'Platform lastSync entrypoint not resolved. Import @calorie-tracker/db from React Native (uses `react-native` field) or Web bundler (uses `browser` field).',
  );
}

