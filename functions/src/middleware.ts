import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { log } from './logger';

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.BACKEND_API_KEY;
  if (!expected) {
    log.warn('[auth] BACKEND_API_KEY not set; rejecting');
    return res.status(500).json({ error: 'Server misconfigured: BACKEND_API_KEY not set' });
  }

  const got = req.header('x-api-key');
  if (!got || got !== expected) return res.status(401).json({ error: 'Invalid API key' });
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


