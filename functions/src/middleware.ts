import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { log } from './logger';
import { BACKEND_API_KEY } from './secrets';

const isEmulator = Boolean(process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_EMULATOR_HUB);

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected =
    (isEmulator && process.env.BACKEND_API_KEY) || BACKEND_API_KEY.value() || process.env.BACKEND_API_KEY || '';
  if (!expected) {
    log.warn('[auth] BACKEND_API_KEY not set; rejecting');
    return res.status(500).json({ error: 'Server misconfigured: BACKEND_API_KEY not set' });
  }

  const got = req.header('x-api-key');
  if (!got || got !== expected) {
    // Don't log the actual key value.
    log.warn('[auth] invalid api key', { hasKey: Boolean(got), gotLen: got?.length ?? 0, expectedLen: expected.length });
    return res.status(401).json({ error: 'Invalid API key' });
  }
  return next();
}

export type AuthedRequest = Request & { authUid?: string };

export async function requireFirebaseAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authz = req.header('authorization') ?? '';
  const match = authz.match(/^Bearer (.+)$/i);
  if (!match) return res.status(401).json({ error: 'Missing Bearer token' });

  const idToken = match[1]!;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.authUid = decoded.uid;
    return next();
  } catch (e) {
    log.warn('[auth] verifyIdToken failed', { error: String(e) });
    return res.status(401).json({ error: 'Invalid auth token' });
  }
}


