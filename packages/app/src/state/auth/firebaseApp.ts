import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getRuntimeConfig } from '@calorie-tracker/core';

export function getFirebaseApp() {
  const cfg = getRuntimeConfig();
  if (!cfg.firebase.apiKey || !cfg.firebase.projectId || !cfg.firebase.appId) {
    throw new Error(
      'Missing Firebase config. Provide FIREBASE_* values via runtime config injection (see README).',
    );
  }

  if (!getApps().length) {
    initializeApp({
      apiKey: cfg.firebase.apiKey,
      authDomain: cfg.firebase.authDomain,
      projectId: cfg.firebase.projectId,
      storageBucket: cfg.firebase.storageBucket,
      messagingSenderId: cfg.firebase.messagingSenderId,
      appId: cfg.firebase.appId,
    });
  }
  return getApps()[0]!;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}


