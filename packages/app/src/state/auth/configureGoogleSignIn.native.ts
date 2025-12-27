import { getRuntimeConfig } from '@calorie-tracker/core';

export function configureGoogleSignInOnce() {
  // Lazy import so Web bundlers don't even see this dependency.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');

  const cfg = getRuntimeConfig();
  if (!cfg.googleWebClientId) {
    // eslint-disable-next-line no-console
    console.warn(
      '[auth] Missing GOOGLE_WEB_CLIENT_ID. Google sign-in will fail until you add it to config/env.local.json',
    );
    return;
  }

  GoogleSignin.configure({ webClientId: cfg.googleWebClientId });
}


