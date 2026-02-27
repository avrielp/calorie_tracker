import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { addDays, fromYmd, toYmd } from '@calorie-tracker/core';
import { SectionCard } from '../components/SectionCard';
import { Row } from '../components/Row';
import { colors } from '../theme';
import { useAuth } from '../../state/auth/AuthProvider';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { loadDayTotals, loadRangeTrend, type TrendPoint } from '../../state/summary/summaryDb';
import { TrendChart } from '../components/TrendChart';

type RangeMode = '2d' | '7d' | '1m' | 'custom';

function Segmented({
  items,
  value,
  onChange,
}: {
  items: Array<{ key: RangeMode; label: string }>;
  value: RangeMode;
  onChange: (key: RangeMode) => void;
}) {
  return (
    <View style={styles.segment}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Text
            key={it.key}
            onPress={() => onChange(it.key)}
            style={[styles.segmentBtn, active && styles.segmentBtnActive, styles.segmentText, active && styles.segmentTextActive]}
          >
            {it.label}
          </Text>
        );
      })}
    </View>
  );
}

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function formatDayTick(d: Date) {
  try {
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${m}/${day}`;
  } catch {
    return '';
  }
}

export function SummaryScreen() {
  const database = useDatabase();
  const { profile } = useAuth();
  const userId = profile?.userId ?? profile?.authUid ?? '';
  const { width: windowWidth } = useWindowDimensions();

  const today = useMemo(() => new Date(), []);
  const todayYmd = toYmd(today);
  const yesterdayYmd = toYmd(addDays(today, -1));

  const [todayTotals, setTodayTotals] = useState({ burned: 0, intake: 0 });
  const [yesterdayTotals, setYesterdayTotals] = useState({ burned: 0, intake: 0 });
  const [last7, setLast7] = useState({ burned: 0, intake: 0 });

  const [rangeMode, setRangeMode] = useState<RangeMode>('7d');
  const [customStart, setCustomStart] = useState(toYmd(addDays(today, -6)));
  const [customEnd, setCustomEnd] = useState(todayYmd);

  const [trend7d, setTrend7d] = useState<TrendPoint[] | null>(null);
  const [trend2d, setTrend2d] = useState<TrendPoint[] | null>(null);
  const [trendCache, setTrendCache] = useState<Record<string, TrendPoint[]>>({});
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<TrendPoint | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  const activeTrend: TrendPoint[] | null = useMemo(() => {
    if (rangeMode === '2d') {
      return trend2d;
    }
    if (rangeMode === '7d') return trend7d;
    if (rangeMode === '1m') return trendCache[`1m:${todayYmd}`] ?? null;
    if (rangeMode === 'custom') return trendCache[`custom:${customStart}:${customEnd}`] ?? null;
    return null;
  }, [customEnd, customStart, rangeMode, todayYmd, trend2d, trend7d, trendCache]);

  const totalNet = useMemo(() => {
    const pts = activeTrend ?? [];
    return pts.reduce((sum, p) => sum + (p.net || 0), 0);
  }, [activeTrend]);

  // "Balance" (aka surplus/deficit) = intake - burned.
  // Negative balance = calories lost (good/green). Positive balance = calories gained (bad/red).
  const totalAbs = Math.abs(Math.round(totalNet));
  const totalColor = totalNet < 0 ? colors.success : totalNet > 0 ? colors.danger : colors.muted;
  const totalSemanticLabel =
    totalNet < 0 ? `${totalAbs} Calories Lost` : totalNet > 0 ? `${totalAbs} Calories gained` : '0 Calories';

  // Recompute whenever Summary gains focus (so Inputs changes reflect immediately).
  useFocusEffect(
    React.useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      (async () => {
        setTrendError(null);
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

        // Refresh the currently selected trend range on focus so it includes the latest local DB writes.
        if (rangeMode === '2d' || rangeMode === '7d' || rangeMode === '1m') {
          setTrendLoading(true);
          try {
            const startYmd = toYmd(addDays(today, rangeMode === '2d' ? -1 : rangeMode === '7d' ? -6 : -29));
            const pts = await loadRangeTrend({ database, userId, startYmd, endYmd: todayYmd });
            if (cancelled) return;
            if (rangeMode === '2d') setTrend2d(pts);
            else if (rangeMode === '7d') setTrend7d(pts);
            else setTrendCache((prev) => ({ ...prev, [`1m:${todayYmd}`]: pts }));
          } catch (e: any) {
            if (!cancelled) setTrendError(e?.message ?? String(e));
          } finally {
            if (!cancelled) setTrendLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [database, rangeMode, today, todayYmd, userId, yesterdayYmd]),
  );

  const loadMonth = async () => {
    if (!userId) return;
    const key = `1m:${todayYmd}`;
    setTrendLoading(true);
    setTrendError(null);
    try {
      const startYmd = toYmd(addDays(today, -29));
      const pts = await loadRangeTrend({ database, userId, startYmd, endYmd: todayYmd });
      setTrendCache((prev) => ({ ...prev, [key]: pts }));
    } catch (e: any) {
      setTrendError(e?.message ?? String(e));
    } finally {
      setTrendLoading(false);
    }
  };

  const loadCustom = async () => {
    if (!userId) return;
    if (!isYmd(customStart) || !isYmd(customEnd)) {
      setTrendError('Custom range must be in YYYY-MM-DD format.');
      return;
    }
    if (customStart > customEnd) {
      setTrendError('Custom range start must be <= end.');
      return;
    }
    const key = `custom:${customStart}:${customEnd}`;
    if (trendCache[key]) return;
    setTrendLoading(true);
    setTrendError(null);
    try {
      const pts = await loadRangeTrend({ database, userId, startYmd: customStart, endYmd: customEnd });
      setTrendCache((prev) => ({ ...prev, [key]: pts }));
    } catch (e: any) {
      setTrendError(e?.message ?? String(e));
    } finally {
      setTrendLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SectionCard title="Calories loss/Gain trend">
        <Segmented
          items={[
            { key: '2d', label: 'Last 2 days' },
            { key: '7d', label: '7 days' },
            { key: '1m', label: '1 month' },
            { key: 'custom', label: 'Custom' },
          ]}
          value={rangeMode}
          onChange={(m) => {
            setTrendError(null);
            setSelectedPoint(null);
            setRangeMode(m);
            if (m === '2d') {
              setTrendLoading(true);
              loadRangeTrend({ database, userId, startYmd: yesterdayYmd, endYmd: todayYmd })
                .then((pts) => setTrend2d(pts))
                .catch((e: any) => setTrendError(e?.message ?? String(e)))
                .finally(() => setTrendLoading(false));
            }
            if (m === '7d') {
              setTrendLoading(true);
              loadRangeTrend({ database, userId, startYmd: toYmd(addDays(today, -6)), endYmd: todayYmd })
                .then((pts) => setTrend7d(pts))
                .catch((e: any) => setTrendError(e?.message ?? String(e)))
                .finally(() => setTrendLoading(false));
            }
            if (m === '1m') loadMonth();
          }}
        />

        {rangeMode === 'custom' ? (
          <View style={{ gap: 10, marginTop: 10 }}>
            <TextField label="Start (YYYY-MM-DD)" value={customStart} onChangeText={setCustomStart} />
            <TextField label="End (YYYY-MM-DD)" value={customEnd} onChangeText={setCustomEnd} />
            <PrimaryButton title="Load range" onPress={() => loadCustom()} />
          </View>
        ) : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalValue, { color: totalColor }]}>{totalSemanticLabel}</Text>
        </View>

        {trendError ? <Text style={styles.trendError}>{trendError}</Text> : null}
        {trendLoading && !activeTrend ? <Text style={styles.muted}>Loading chart…</Text> : null}

        {activeTrend && activeTrend.length > 0 ? (
          <View
            style={styles.chartWrap}
            onLayout={(e) => {
              const w = Math.floor(e.nativeEvent.layout.width);
              if (w && w !== chartWidth) setChartWidth(w);
            }}
          >
            {chartWidth > 0 ? (
              <TrendChart
                width={chartWidth}
                height={230}
                points={activeTrend.map((p) => ({
                  label: formatDayTick(p.x),
                  value: p.y,
                }))}
                onPointPress={(index) => {
                  const pt = activeTrend[index];
                  if (pt) setSelectedPoint(pt);
                }}
              />
            ) : (
              <Text style={styles.muted}>Loading chart…</Text>
            )}
          </View>
        ) : (
          <Text style={styles.muted}>No trend data yet.</Text>
        )}

        {activeTrend && activeTrend.length > 0 ? (
          <Text style={styles.mutedHint}>Tip: tap/click a point to see details.</Text>
        ) : null}

        {selectedPoint ? (
          <View style={styles.pointCard}>
            <Text style={styles.pointTitle}>{selectedPoint.ymd}</Text>
            <View style={styles.pointRows}>
              <Text style={styles.pointRow}>Burned: {Math.round(selectedPoint.burned)} cal</Text>
              <Text style={styles.pointRow}>Intake: {Math.round(selectedPoint.intake)} cal</Text>
              <Text style={styles.pointRow}>
                Gain/Loss (burned - intake): {selectedPoint.net >= 0 ? '+' : ''}
                {Math.round(selectedPoint.net)} cal
              </Text>
            </View>
          </View>
        ) : null}
      </SectionCard>

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
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  segmentBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#0E1016', textAlign: 'center' },
  segmentBtnActive: { backgroundColor: '#182033' },
  segmentText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  segmentTextActive: { color: colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  totalLabel: { color: colors.muted, fontWeight: '800' },
  totalValue: { fontWeight: '900', fontSize: 16 },
  trendError: { color: colors.danger, fontWeight: '900', marginTop: 10 },
  chartWrap: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' },
  mutedHint: { color: colors.muted, fontSize: 12, marginTop: 6 },
  pointCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0E1016',
    borderRadius: 14,
    padding: 12,
  },
  pointTitle: { color: colors.text, fontWeight: '900' },
  pointRows: { marginTop: 8, gap: 4 },
  pointRow: { color: colors.muted, fontWeight: '700' },
});


