import { getRuntimeConfig, type AiEstimateItem } from '@calorie-tracker/core';

export async function estimateFromText(args: {
  idToken: string;
  userId: string;
  text: string;
}): Promise<{ items: AiEstimateItem[] }> {
  const cfg = getRuntimeConfig();
  if (!cfg.backendBaseUrl) throw new Error('Missing BACKEND_BASE_URL runtime config');
  if (!cfg.backendApiKey) throw new Error('Missing BACKEND_API_KEY runtime config');

  const res = await fetch(`${cfg.backendBaseUrl}/ai/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${args.idToken}`,
      'x-api-key': cfg.backendApiKey,
    },
    body: JSON.stringify({ userId: args.userId, text: args.text }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ai/text failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function estimateFromPhoto(args: {
  idToken: string;
  userId: string;
  mimeType: string;
  imageBase64: string;
}): Promise<{ items: AiEstimateItem[] }> {
  const cfg = getRuntimeConfig();
  if (!cfg.backendBaseUrl) throw new Error('Missing BACKEND_BASE_URL runtime config');
  if (!cfg.backendApiKey) throw new Error('Missing BACKEND_API_KEY runtime config');

  const res = await fetch(`${cfg.backendBaseUrl}/ai/photo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${args.idToken}`,
      'x-api-key': cfg.backendApiKey,
    },
    body: JSON.stringify({
      userId: args.userId,
      mimeType: args.mimeType,
      imageBase64: args.imageBase64,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ai/photo failed: ${res.status} ${text}`);
  }
  return res.json();
}


