import React from 'react';
import { AppRoot } from '@calorie-tracker/app';

// Inject runtime config for `@calorie-tracker/core/getRuntimeConfig()`.
// Create `config/env.local.json` (see `config/env.local.json.example`).
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (globalThis as any).__APP_CONFIG__ = require('../../config/env.local.json');
} catch {
  // eslint-disable-next-line no-console
  console.warn(
    '[config] Missing config/env.local.json. Copy config/env.local.json.example to config/env.local.json and fill in values.',
  );
  (globalThis as any).__APP_CONFIG__ = {};
}

export default function App() {
  return <AppRoot />;
}
