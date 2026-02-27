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
    let msg = `AI request failed (${res.status})`;
    try {
      const json = await res.json();
      if (json && typeof json === 'object' && typeof (json as any).error === 'string') msg = String((json as any).error);
      else msg = JSON.stringify(json);
    } catch {
      try {
        msg = await res.text();
      } catch {
        // ignore
      }
    }
    throw new Error(msg);
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
    let msg = `AI request failed (${res.status})`;
    try {
      const json = await res.json();
      if (json && typeof json === 'object' && typeof (json as any).error === 'string') msg = String((json as any).error);
      else msg = JSON.stringify(json);
    } catch {
      try {
        msg = await res.text();
      } catch {
        // ignore
      }
    }
    throw new Error(msg);
  }
  return res.json();
}


