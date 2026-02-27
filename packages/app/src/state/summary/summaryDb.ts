import { Q } from '@nozbe/watermelondb';
import { addDays, caloriesBurned, caloriesExpenditureSum, fromYmd, toYmd } from '@calorie-tracker/core';
import { TABLES } from '@calorie-tracker/db';

export type SummaryDayTotals = { burned: number; intake: number };
export type TrendPoint = {
  x: Date;
  ymd: string;
  burned: number;
  intake: number;
  net: number; // burned - intake
  y: number; // alias for chart libraries
};

export async function loadDayTotals(args: {
  database: any;
  userId: string;
  dateYmd: string;
}): Promise<SummaryDayTotals> {
  const { database, userId, dateYmd } = args;

  const healthRows = await database
    .get(TABLES.ios_health_tracker)
    .query(Q.where('userId', userId), Q.where('date', dateYmd))
    .fetch();
  const health = healthRows[0] as any | undefined;
  const burned = caloriesBurned(health?.restingCalories ?? 0, health?.activeCalories ?? 0);

  const items = await database
    .get(TABLES.calorie_expenditure_items)
    .query(Q.where('userId', userId), Q.where('date', dateYmd))
    .fetch();
  const intake = caloriesExpenditureSum(items as any[]);
  return { burned, intake };
}

export async function loadRangeTrend(args: {
  database: any;
  userId: string;
  startYmd: string;
  endYmd: string;
}): Promise<TrendPoint[]> {
  const { database, userId, startYmd, endYmd } = args;

  const healthRows = await database
    .get(TABLES.ios_health_tracker)
    .query(Q.where('userId', userId), Q.where('date', Q.gte(startYmd)), Q.where('date', Q.lte(endYmd)))
    .fetch();
  const healthByDate = new Map<string, any>();
  for (const r of healthRows as any[]) {
    const d = String((r as any).dateYmd ?? '');
    if (d) healthByDate.set(d, r);
  }

  const itemRows = await database
    .get(TABLES.calorie_expenditure_items)
    .query(Q.where('userId', userId), Q.where('date', Q.gte(startYmd)), Q.where('date', Q.lte(endYmd)))
    .fetch();
  const intakeByDate = new Map<string, number>();
  for (const r of itemRows as any[]) {
    const d = String((r as any).dateYmd ?? '');
    if (!d) continue;
    const cals = Number((r as any).calories ?? 0) || 0;
    intakeByDate.set(d, (intakeByDate.get(d) ?? 0) + cals);
  }

  const points: TrendPoint[] = [];
  let cur = fromYmd(startYmd);
  const end = fromYmd(endYmd);
  while (cur.getTime() <= end.getTime()) {
    const ymd = toYmd(cur);
    const health = healthByDate.get(ymd);
    const burned = caloriesBurned(health?.restingCalories ?? 0, health?.activeCalories ?? 0);
    const intake = intakeByDate.get(ymd) ?? 0;
    const net = burned - intake;
    const invertedNet = -net;
    points.push({ x: new Date(cur.getTime()), ymd, burned, intake, net: invertedNet, y: invertedNet });
    cur = addDays(cur, 1);
  }
  console.log('points', points);
  return points;
}

