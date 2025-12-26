export async function syncNow(): Promise<never> {
  throw new Error(
    'Platform sync entrypoint not resolved. Import @calorie-tracker/db from React Native (uses `react-native` field) or Web bundler (uses `browser` field).',
  );
}


