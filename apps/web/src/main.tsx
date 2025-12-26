import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from '@calorie-tracker/app';

// Inject runtime config for `@calorie-tracker/core/getRuntimeConfig()`
// (Vite only exposes env vars prefixed with `VITE_`).
(globalThis as any).__APP_CONFIG__ = {
  BACKEND_BASE_URL: import.meta.env.VITE_BACKEND_BASE_URL,
  BACKEND_API_KEY: import.meta.env.VITE_BACKEND_API_KEY,
  GOOGLE_WEB_CLIENT_ID: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
  FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>,
);


