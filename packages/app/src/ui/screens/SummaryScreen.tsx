import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { caloriesBurned, caloriesExpenditureSum, toYmd, addDays } from '@calorie-tracker/core';
import { TABLES } from '@calorie-tracker/db';
import { SectionCard } from '../components/SectionCard';
import { Row } from '../components/Row';
import { colors } from '../theme';
import { useAuth } from '../../state/auth/AuthProvider';

async function loadDayTotals(args: { database: any; userId: string; dateYmd: string }) {
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

export function SummaryScreen() {
  const database = useDatabase();
  const { profile } = useAuth();
  const userId = profile?.userId ?? profile?.authUid ?? '';

  const today = useMemo(() => new Date(), []);
  const todayYmd = toYmd(today);
  const yesterdayYmd = toYmd(addDays(today, -1));

  const [todayTotals, setTodayTotals] = useState({ burned: 0, intake: 0 });
  const [yesterdayTotals, setYesterdayTotals] = useState({ burned: 0, intake: 0 });
  const [last7, setLast7] = useState({ burned: 0, intake: 0 });

  // Recompute whenever Summary gains focus (so Inputs changes reflect immediately).
  useFocusEffect(
    React.useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      (async () => {
        const [t, y] = await Promise.all([
          loadDayTotals({ database, userId, dateYmd: todayYmd }),
          loadDayTotals({ database, userId, dateYmd: yesterdayYmd }),
        ]);
        if (cancelled) return;
        setTodayTotals(t);
        setYesterdayTotals(y);

        const days = Array.from({ length: 7 }, (_, i) => toYmd(addDays(today, -i)));
        let burned = 0;
        let intake = 0;
        for (const d of days) {
          const v = await loadDayTotals({ database, userId, dateYmd: d });
          burned += v.burned;
          intake += v.intake;
        }
        if (!cancelled) setLast7({ burned, intake });
      })();
      return () => {
        cancelled = true;
      };
    }, [database, today, todayYmd, userId, yesterdayYmd]),
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SectionCard title="Today">
        <Row label="Calories Burned" value={todayTotals.burned} hint="Resting + Active (HealthKit on iOS)" />
        <Row label="Calories Intake" value={todayTotals.intake} hint="Sum of your input items" />
      </SectionCard>

      <SectionCard title="Yesterday">
        <Row label="Calories Burned" value={yesterdayTotals.burned} />
        <Row label="Calories Intake" value={yesterdayTotals.intake} />
      </SectionCard>

      <SectionCard title="Last 7 Days">
        <Row label="Total Burned" value={last7.burned} />
        <Row label="Total Intake" value={last7.intake} />
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
});


