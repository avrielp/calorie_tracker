import { Platform } from 'react-native';
import type { DayHealthMetrics } from './types';

export async function readDayHealthMetrics(_dateYmd: string): Promise<DayHealthMetrics> {
  if (Platform.OS !== 'ios') {
    return { restingCalories: 0, activeCalories: 0, distanceWalkingAndRunning: 0, exerciseMinutes: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AppleHealthKit = require('react-native-health').default ?? require('react-native-health');

  const start = new Date(`${_dateYmd}T00:00:00.000Z`);
  const end = new Date(`${_dateYmd}T23:59:59.999Z`);

  const init = (): Promise<void> =>
    new Promise((resolve) => {
      if (!AppleHealthKit?.initHealthKit) return resolve();
      AppleHealthKit.initHealthKit(
        {
          permissions: {
            read: ['ActiveEnergyBurned', 'BasalEnergyBurned', 'DistanceWalkingRunning', 'AppleExerciseTime'],
            write: [],
          },
        },
        (_err: any) => resolve(),
      );
    });

  const sumSamples = (samples: any[]): number =>
    (samples ?? []).reduce((sum, s) => sum + (Number(s?.value) || 0), 0);

  const call = (fnName: string): Promise<number> =>
    new Promise((resolve) => {
      const fn = AppleHealthKit?.[fnName];
      if (typeof fn !== 'function') return resolve(0);
      fn({ startDate: start.toISOString(), endDate: end.toISOString() }, (err: any, results: any[]) => {
        if (err) return resolve(0);
        resolve(sumSamples(results));
      });
    });

  await init();

  const [active, resting, distance, exercise] = await Promise.all([
    call('getActiveEnergyBurned'),
    call('getBasalEnergyBurned'),
    call('getDistanceWalkingRunning'),
    call('getAppleExerciseTime'),
  ]);

  return {
    restingCalories: Math.round(resting),
    activeCalories: Math.round(active),
    distanceWalkingAndRunning: Math.round(distance),
    exerciseMinutes: Math.round(exercise),
  };
}


