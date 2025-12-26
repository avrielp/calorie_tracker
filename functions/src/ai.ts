import type { Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { log } from './logger';
import type { AuthedRequest } from './middleware';

const AiItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  calories: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1).optional(),
});

const AiResponseSchema = z.object({
  items: z.array(AiItemSchema),
});

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(key);
}

function parseModelJson(text: string): unknown {
  // When responseMimeType is honored, this is already JSON.
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: try extracting a JSON object substring.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw new Error('Model did not return JSON');
    const raw = text.slice(start, end + 1);
    return JSON.parse(raw);
  }
}

const TextBodySchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1),
});

export async function estimateFromText(req: AuthedRequest, res: Response) {
  const authUid = req.authUid!;
  const parsed = TextBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  log.info('[ai] text estimate', { authUid, userId: parsed.data.userId });

  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a calorie estimation assistant.

Return STRICT JSON only (no markdown, no prose).

Output schema:
{
  "items": [
    { "name": string, "description"?: string, "calories": integer, "confidence"?: number }
  ]
}

Rules:
- If multiple foods/drinks are described, split into separate items.
- "calories" must be a non-negative integer.
- "confidence" is optional and should be between 0 and 1.

User text:
${parsed.data.text}
`.trim();

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    // Some SDK versions don't type this field; keep it as `any` while still sending it to Gemini.
    generationConfig: { responseMimeType: 'application/json' } as any,
  });

  const raw = result.response.text();
  try {
    const json = parseModelJson(raw);
    const out = AiResponseSchema.parse(json);
    log.info('[ai] text estimate ok', { count: out.items.length });
    return res.json(out);
  } catch (e: any) {
    log.warn('[ai] text parse failed', { error: e?.message ?? String(e), raw: raw.slice(0, 800) });
    return res.status(500).json({ error: 'Failed to parse model output' });
  }
}

const PhotoBodySchema = z.object({
  userId: z.string().min(1),
  mimeType: z.string().min(3),
  imageBase64: z.string().min(10),
});

export async function estimateFromPhoto(req: AuthedRequest, res: Response) {
  const authUid = req.authUid!;
  const parsed = PhotoBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  log.info('[ai] photo estimate', { authUid, userId: parsed.data.userId, mimeType: parsed.data.mimeType });

  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a calorie estimation assistant.

Return STRICT JSON only (no markdown, no prose).

Output schema:
{
  "items": [
    { "name": string, "description"?: string, "calories": integer, "confidence"?: number }
  ]
}

Rules:
- Split multiple foods/drinks into separate items when possible.
- "calories" must be a non-negative integer.
- "confidence" is optional and should be between 0 and 1.
`.trim();

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: parsed.data.mimeType,
              data: parsed.data.imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json' } as any,
  });

  const raw = result.response.text();
  try {
    const json = parseModelJson(raw);
    const out = AiResponseSchema.parse(json);
    log.info('[ai] photo estimate ok', { count: out.items.length });
    return res.json(out);
  } catch (e: any) {
    log.warn('[ai] photo parse failed', { error: e?.message ?? String(e), raw: raw.slice(0, 800) });
    return res.status(500).json({ error: 'Failed to parse model output' });
  }
}
