export function makeDatabase(): never {
  throw new Error(
    'Platform database entrypoint not resolved. Import @calorie-tracker/db from React Native (uses `react-native` field) or Web bundler (uses `browser` field).',
  );
}


