import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { log } from './logger';
import type { AuthedRequest } from './middleware';

const UserProfileSchema = z.object({
  userId: z.string(),
  authUid: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  photoURL: z.string().optional(),
});

export async function getOrCreateProfile(req: AuthedRequest, res: Response) {
  const authUid = req.authUid!;
  const db = admin.firestore();

  log.info('[profile] getOrCreateProfile', { authUid });

  // Fast path mapping
  const mappingRef = db.collection('authUidToUserId').doc(authUid);
  const mappingSnap = await mappingRef.get();
  if (mappingSnap.exists) {
    const userId = mappingSnap.get('userId') as string;
    const userSnap = await db.collection('users').doc(userId).get();
    if (userSnap.exists) {
      const profile = UserProfileSchema.parse(userSnap.data());
      return res.json(profile);
    }
    log.warn('[profile] mapping exists but user doc missing', { authUid, userId });
  }

  // Create new profile doc
  const user = await admin.auth().getUser(authUid);
  const profile = {
    userId: uuidv4(),
    authUid,
    name: user.displayName ?? undefined,
    email: user.email ?? undefined,
    photoURL: user.photoURL ?? undefined,
    createdAt: Date.now(),
  };

  await db.runTransaction(async (tx) => {
    tx.set(db.collection('users').doc(profile.userId), profile, { merge: true });
    tx.set(mappingRef, { userId: profile.userId }, { merge: true });
  });

  log.info('[profile] created', { authUid, userId: profile.userId });

  const response = UserProfileSchema.parse(profile);
  return res.json(response);
}


