import admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import { log } from './logger';
import { requireApiKey, requireFirebaseAuth } from './middleware';
import { getOrCreateProfile } from './profile';
import { pullChanges, pushChanges } from './sync';
import { estimateFromPhoto, estimateFromText } from './ai';

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/profile/me', requireApiKey, requireFirebaseAuth, getOrCreateProfile);

app.get('/sync/pull', requireApiKey, requireFirebaseAuth, pullChanges);
app.post('/sync/push', requireApiKey, requireFirebaseAuth, pushChanges);

app.post('/ai/text', requireApiKey, requireFirebaseAuth, estimateFromText);
app.post('/ai/photo', requireApiKey, requireFirebaseAuth, estimateFromPhoto);

app.use((err: any, _req: any, res: any, _next: any) => {
  log.error('[api] unhandled error', { error: String(err) });
  res.status(500).json({ error: 'Internal server error' });
});

export const api = onRequest({ region: 'us-central1' }, app);


