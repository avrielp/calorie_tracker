import type { Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';
import { log } from './logger';
import type { AuthedRequest } from './middleware';

const TableNameSchema = z.enum([
  'calories_total_burned',
  'ios_health_tracker',
  'calorie_expenditure_items',
  'goals',
]);

type TableName = z.infer<typeof TableNameSchema>;

function tableRef(db: admin.firestore.Firestore, userId: string, table: TableName) {
  return db.collection('users').doc(userId).collection(table);
}

async function assertUserAccess(args: { db: admin.firestore.Firestore; authUid: string; userId: string }) {
  const { db, authUid, userId } = args;
  const mappingSnap = await db.collection('authUidToUserId').doc(authUid).get();
  if (!mappingSnap.exists) throw new Error('No profile mapping for auth uid');
  const mapped = mappingSnap.get('userId');
  if (mapped !== userId) throw new Error('userId does not match authenticated user');
}

export async function pullChanges(req: AuthedRequest, res: Response) {
  const authUid = req.authUid!;
  const userId = String(req.query.userId ?? '');
  const since = Number(req.query.since ?? 0);

  log.info('[sync] pull', { authUid, userId, since });

  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!Number.isFinite(since) || since < 0) return res.status(400).json({ error: 'Invalid since' });

  const db = admin.firestore();
  try {
    await assertUserAccess({ db, authUid, userId });
  } catch (e: any) {
    log.warn('[sync] pull forbidden', { authUid, userId, error: e?.message ?? String(e) });
    return res.status(403).json({ error: 'Forbidden' });
  }

  const timestamp = Date.now();
  const changes: Record<string, { created: any[]; updated: any[]; deleted: string[] }> = {};

  const tables = TableNameSchema.options as TableName[];
  for (const table of tables) {
    changes[table] = { created: [], updated: [], deleted: [] };
    const ref = tableRef(db, userId, table);

    // NOTE: requires docs to store `lastUpdated` as a number.
    const snap = await ref.where('lastUpdated', '>', since).orderBy('lastUpdated', 'asc').get();

    snap.forEach((doc) => {
      const data = doc.data() as any;
      const isDeleted = !!data._deleted;
      if (isDeleted) {
        changes[table].deleted.push(doc.id);
        return;
      }

      const row = { ...data, id: doc.id };
      delete (row as any)._deleted;
      const createdAt = Number((row as any).createdAt ?? 0);
      delete (row as any).createdAt;

      if (since === 0 || (Number.isFinite(createdAt) && createdAt > since)) changes[table].created.push(row);
      else changes[table].updated.push(row);
    });
  }

  log.info('[sync] pull done', {
    userId,
    since,
    counts: Object.fromEntries(
      Object.entries(changes).map(([k, v]) => [k, { c: v.created.length, u: v.updated.length, d: v.deleted.length }]),
    ),
  });

  return res.json({ changes, timestamp });
}

const PushBodySchema = z.object({
  userId: z.string().min(1),
  lastPulledAt: z.number().optional(),
  changes: z.record(
    z.string(),
    z.object({
      created: z.array(z.any()).optional(),
      updated: z.array(z.any()).optional(),
      deleted: z.array(z.string()).optional(),
    }),
  ),
});

export async function pushChanges(req: AuthedRequest, res: Response) {
  const authUid = req.authUid!;
  const parsed = PushBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  const { userId, changes } = parsed.data;
  log.info('[sync] push', { authUid, userId });

  const db = admin.firestore();
  try {
    await assertUserAccess({ db, authUid, userId });
  } catch (e: any) {
    log.warn('[sync] push forbidden', { authUid, userId, error: e?.message ?? String(e) });
    return res.status(403).json({ error: 'Forbidden' });
  }

  const now = Date.now();
  const batch = db.batch();
  const tables = TableNameSchema.options as TableName[];

  for (const table of tables) {
    const delta = (changes as any)[table];
    if (!delta) continue;

    const ref = tableRef(db, userId, table);
    for (const row of delta.created ?? []) {
      if (!row?.id) continue;
      const { id, ...data } = row;
      const docRef = ref.doc(String(row.id));
      batch.set(
        docRef,
        {
          ...data,
          userId,
          lastUpdated: now,
          createdAt: now,
          _deleted: false,
        },
        { merge: true },
      );
    }

    for (const row of delta.updated ?? []) {
      if (!row?.id) continue;
      const { id, ...data } = row;
      const docRef = ref.doc(String(row.id));
      batch.set(
        docRef,
        {
          ...data,
          userId,
          lastUpdated: now,
          _deleted: false,
        },
        { merge: true },
      );
    }

    for (const id of delta.deleted ?? []) {
      const docRef = ref.doc(String(id));
      batch.set(
        docRef,
        {
          userId,
          lastUpdated: now,
          _deleted: true,
        },
        { merge: true },
      );
    }
  }

  await batch.commit();
  log.info('[sync] push done', { userId });
  return res.json({ ok: true, timestamp: now });
}


