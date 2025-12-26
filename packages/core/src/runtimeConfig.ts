export type RuntimeConfig = {
  backendBaseUrl: string;
  backendApiKey: string;
  googleWebClientId?: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId: string;
  };
};

function readString(obj: any, key: string): string | undefined {
  const v = obj?.[key];
  return typeof v === 'string' && v.trim().length ? v : undefined;
}

export function getRuntimeConfig(): RuntimeConfig {
  const injected = (globalThis as any).__APP_CONFIG__ ?? {};
  const env =
    // Vite / web
    (typeof process !== 'undefined' ? (process as any).env : undefined) ??
    {};

  const backendBaseUrl =
    readString(injected, 'BACKEND_BASE_URL') ?? readString(env, 'BACKEND_BASE_URL') ?? '';
  const backendApiKey =
    readString(injected, 'BACKEND_API_KEY') ?? readString(env, 'BACKEND_API_KEY') ?? '';
  const googleWebClientId =
    readString(injected, 'GOOGLE_WEB_CLIENT_ID') ?? readString(env, 'GOOGLE_WEB_CLIENT_ID');

  const firebase = {
    apiKey: readString(injected, 'FIREBASE_API_KEY') ?? readString(env, 'FIREBASE_API_KEY') ?? '',
    authDomain:
      readString(injected, 'FIREBASE_AUTH_DOMAIN') ?? readString(env, 'FIREBASE_AUTH_DOMAIN') ?? '',
    projectId:
      readString(injected, 'FIREBASE_PROJECT_ID') ?? readString(env, 'FIREBASE_PROJECT_ID') ?? '',
    storageBucket:
      readString(injected, 'FIREBASE_STORAGE_BUCKET') ?? readString(env, 'FIREBASE_STORAGE_BUCKET'),
    messagingSenderId:
      readString(injected, 'FIREBASE_MESSAGING_SENDER_ID') ??
      readString(env, 'FIREBASE_MESSAGING_SENDER_ID'),
    appId: readString(injected, 'FIREBASE_APP_ID') ?? readString(env, 'FIREBASE_APP_ID') ?? '',
  };

  return { backendBaseUrl, backendApiKey, googleWebClientId, firebase };
}


