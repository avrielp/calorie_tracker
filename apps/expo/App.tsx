import React from 'react';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';

import { AppRoot } from '@calorie-tracker/app';
import Constants from 'expo-constants';

export default function App() {
  // Inject runtime config for `@calorie-tracker/core/getRuntimeConfig()`.
  // Expo loads this from `apps/expo/app.config.ts` → `extra.APP_CONFIG`.
  (globalThis as any).__APP_CONFIG__ = (Constants.expoConfig as any)?.extra?.APP_CONFIG ?? {};

  return <AppRoot />;
}
