import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { newId } from '@calorie-tracker/core';
import { TABLES } from './constants';
import type { CalorieItemInput, GoalType } from '@calorie-tracker/core';

export async function listExpenditureItemsByDate(args: {
  database: Database;
  userId: string;
  dateYmd: string;
}) {
  const { database, userId, dateYmd } = args;
  return database
    .get(TABLES.calorie_expenditure_items)
    .query(Q.where('userId', userId), Q.where('date', dateYmd))
    .fetch();
}

export async function listExpenditureItemsByDateRange(args: {
  database: Database;
  userId: string;
  startYmd: string;
  endYmd: string;
}) {
  const { database, userId, startYmd, endYmd } = args;
  return database
    .get(TABLES.calorie_expenditure_items)
    .query(
      Q.where('userId', userId),
      Q.where('date', Q.gte(startYmd)),
      Q.where('date', Q.lte(endYmd)),
      Q.sortBy('date', Q.desc),
      Q.sortBy('updated_at', Q.desc),
    )
    .fetch();
}

export async function upsertCaloriesTotalBurned(args: {
  database: Database;
  userId: string;
  dateYmd: string;
  totalCalories: number;
  lastUpdated: number;
}) {
  const { database, userId, dateYmd, totalCalories, lastUpdated } = args;
  const collection = database.get(TABLES.calories_total_burned);
  const existing = await collection
    .query(Q.where('userId', userId), Q.where('date', dateYmd))
    .fetch();

  await database.write(async () => {
    if (existing[0]) {
      await existing[0].update((rec: any) => {
        rec.totalCalories = totalCalories;
        rec.lastUpdated = lastUpdated;
      });
      return;
    }
    await collection.create((rec: any) => {
      rec._raw.id = newId();
      rec.userId = userId;
      rec.dateYmd = dateYmd;
      rec.totalCalories = totalCalories;
      rec.lastUpdated = lastUpdated;
    });
  });
}

export async function upsertIosHealthTracker(args: {
  database: Database;
  userId: string;
  dateYmd: string;
  restingCalories: number;
  activeCalories: number;
  distanceWalkingAndRunning: number;
  exerciseMinutes: number;
  lastUpdated: number;
}) {
  const { database, userId, dateYmd, lastUpdated } = args;
  const collection = database.get(TABLES.ios_health_tracker);
  const existing = await collection.query(Q.where('userId', userId), Q.where('date', dateYmd)).fetch();

  await database.write(async () => {
    if (existing[0]) {
      await existing[0].update((rec: any) => {
        rec.restingCalories = args.restingCalories;
        rec.activeCalories = args.activeCalories;
        rec.distanceWalkingAndRunning = args.distanceWalkingAndRunning;
        rec.exerciseMinutes = args.exerciseMinutes;
        rec.lastUpdated = lastUpdated;
      });
      return;
    }
    await collection.create((rec: any) => {
      rec._raw.id = newId();
      rec.userId = userId;
      rec.dateYmd = dateYmd;
      rec.restingCalories = args.restingCalories;
      rec.activeCalories = args.activeCalories;
      rec.distanceWalkingAndRunning = args.distanceWalkingAndRunning;
      rec.exerciseMinutes = args.exerciseMinutes;
      rec.lastUpdated = lastUpdated;
    });
  });
}

export async function addExpenditureItem(args: {
  database: Database;
  userId: string;
  dateYmd: string;
  item: CalorieItemInput;
  lastUpdated: number;
}) {
  const { database, userId, dateYmd, item, lastUpdated } = args;
  const collection = database.get(TABLES.calorie_expenditure_items);
  await database.write(async () => {
    await collection.create((rec: any) => {
      rec._raw.id = newId();
      rec.userId = userId;
      rec.dateYmd = dateYmd;
      rec.name = item.name;
      rec.description = item.description ?? '';
      rec.calories = item.calories;
      rec.lastUpdated = lastUpdated;
    });
  });
}

export async function deleteRecord(args: { database: Database; table: string; id: string }) {
  const { database, table, id } = args;
  const collection = database.get(table);
  const record = await collection.find(id);
  await database.write(async () => {
    await record.markAsDeleted(); // keep tombstone for sync
  });
}

export async function upsertGoal(args: {
  database: Database;
  userId: string;
  id?: string;
  dateYmd: string;
  name: string;
  goalType: GoalType;
  target: number;
  bonusAllowance?: number;
  lastUpdated: number;
}) {
  const { database, userId, id, lastUpdated } = args;
  const collection = database.get(TABLES.goals);
  const existing = id ? await collection.find(id).catch(() => null) : null;

  await database.write(async () => {
    if (existing) {
      await existing.update((rec: any) => {
        rec.userId = userId;
        rec.dateYmd = args.dateYmd;
        rec.name = args.name;
        rec.goalType = args.goalType;
        rec.target = args.target;
        rec.bonusAllowance = args.bonusAllowance ?? 0;
        rec.lastUpdated = lastUpdated;
      });
      return;
    }
    await collection.create((rec: any) => {
      rec._raw.id = id ?? newId();
      rec.userId = userId;
      rec.dateYmd = args.dateYmd;
      rec.name = args.name;
      rec.goalType = args.goalType;
      rec.target = args.target;
      rec.bonusAllowance = args.bonusAllowance ?? 0;
      rec.lastUpdated = lastUpdated;
    });
  });
}

export async function listGoals(args: { database: Database; userId: string }) {
  const { database, userId } = args;
  return database.get(TABLES.goals).query(Q.where('userId', userId), Q.sortBy('updated_at', Q.desc)).fetch();
}


