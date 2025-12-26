import { getRuntimeConfig, type UserProfile } from '@calorie-tracker/core';

export async function getOrCreateUserProfile(args: { idToken: string }): Promise<UserProfile> {
  const cfg = getRuntimeConfig();
  if (!cfg.backendBaseUrl) throw new Error('Missing BACKEND_BASE_URL runtime config');
  if (!cfg.backendApiKey) throw new Error('Missing BACKEND_API_KEY runtime config');

  const res = await fetch(`${cfg.backendBaseUrl}/profile/me`, {
    headers: {
      Authorization: `Bearer ${args.idToken}`,
      'x-api-key': cfg.backendApiKey,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`profile/me failed: ${res.status} ${text}`);
  }
  return res.json();
}


