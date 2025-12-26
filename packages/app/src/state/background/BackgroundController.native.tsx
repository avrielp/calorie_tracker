import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { caloriesBurned, addDays, toYmd } from '@calorie-tracker/core';
import { TABLES, syncNow, upsertCaloriesTotalBurned, upsertIosHealthTracker } from '@calorie-tracker/db';
import { useAuth } from '../auth/AuthProvider';
import { readDayHealthMetrics } from '../health/iosHealth';

export function BackgroundController() {
  const configured = useRef(false);
  const database = useDatabase();
  const { profile, getIdToken } = useAuth();
  const userId = profile?.userId ?? profile?.authUid ?? '';

  useEffect(() => {
    if (!userId) return;
    if (configured.current) return;
    configured.current = true;

    const configure = async () => {
      await BackgroundFetch.configure(
        {
          minimumFetchInterval: 15,
          startOnBoot: true,
          stopOnTerminate: false,
          enableHeadless: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        },
        async (taskId) => {
          try {
            const now = Date.now();
            const today = toYmd(new Date());

            if (Platform.OS === 'ios') {
              const count = await database
                .get(TABLES.ios_health_tracker)
                .query(Q.where('userId', userId))
                .fetchCount();

              const daysToPopulate = count === 0 ? 90 : 1;
              for (let i = 0; i < daysToPopulate; i++) {
                const dateYmd = toYmd(addDays(new Date(), -i));
                const metrics = await readDayHealthMetrics(dateYmd);
                await upsertIosHealthTracker({
                  database,
                  userId,
                  dateYmd,
                  restingCalories: metrics.restingCalories,
                  activeCalories: metrics.activeCalories,
                  distanceWalkingAndRunning: metrics.distanceWalkingAndRunning,
                  exerciseMinutes: metrics.exerciseMinutes,
                  lastUpdated: now,
                });
                await upsertCaloriesTotalBurned({
                  database,
                  userId,
                  dateYmd,
                  totalCalories: caloriesBurned(metrics.restingCalories, metrics.activeCalories),
                  lastUpdated: now,
                });
              }
            } else {
              // Non-iOS: only sync
              void today;
            }

            await syncNow({ database, userId, getIdToken });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[background-fetch] task failed', e);
          } finally {
            BackgroundFetch.finish(taskId);
          }
        },
        (error) => {
          // eslint-disable-next-line no-console
          console.warn('[background-fetch] configure error', error);
        },
      );

      // eslint-disable-next-line no-console
      console.log('[background-fetch] configured');
    };

    configure();
  }, [database, getIdToken, userId]);

  return null;
}


