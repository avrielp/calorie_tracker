import type { DayHealthMetrics } from './types';

export async function readDayHealthMetrics(_dateYmd: string): Promise<DayHealthMetrics> {
  return { restingCalories: 0, activeCalories: 0, distanceWalkingAndRunning: 0, exerciseMinutes: 0 };
}


