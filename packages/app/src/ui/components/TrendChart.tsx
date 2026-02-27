import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

export type TrendChartPoint = {
  label: string;
  value: number; // displayed value (higher is "better"/higher on chart)
};

function fmt(v: number) {
  const n = Math.round(v);
  return `${n >= 0 ? '+' : ''}${n}`;
}

export function TrendChart({
  width,
  height,
  points,
  onPointPress,
}: {
  width: number;
  height: number;
  points: TrendChartPoint[];
  onPointPress?: (index: number) => void;
}) {
  const padLeft = 46;
  const padRight = 26;
  const padTop = 14;
  const padBottom = 28;

  const innerW = Math.max(1, width - padLeft - padRight);
  const innerH = Math.max(1, height - padTop - padBottom);

  const values = useMemo(() => points.map((p) => p.value), [points]);
  const minVal = useMemo(() => (values.length ? Math.min(...values) : 0), [values]);
  const maxVal = useMemo(() => (values.length ? Math.max(...values) : 0), [values]);
  const range = useMemo(() => {
    if (minVal === maxVal) return 1;
    return maxVal - minVal;
  }, [maxVal, minVal]);

  const xAt = (i: number) => {
    if (points.length <= 1) return padLeft + innerW / 2;
    return padLeft + (innerW * i) / (points.length - 1);
  };

  // Normal axis: higher values appear closer to the top.
  const yAt = (v: number) => padTop + ((maxVal - v) / range) * innerH;

  const pathD = useMemo(() => {
    if (!points.length) return '';
    return points
      .map((p, i) => {
        const x = xAt(i);
        const y = yAt(p.value);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, minVal, maxVal, range, width, height]);

  const zeroY = useMemo(() => {
    if (minVal > 0 || maxVal < 0) return null;
    return yAt(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minVal, maxVal, range]);

  const labelStep = useMemo(() => {
    if (points.length <= 8) return 1;
    return Math.ceil(points.length / 7);
  }, [points.length]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* horizontal grid */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padTop + (innerH * i) / 4;
          return <Line key={i} x1={padLeft} y1={y} x2={padLeft + innerW} y2={y} stroke="#141822" strokeWidth={1} />;
        })}

        {/* y labels */}
        <SvgText x={6} y={padTop + 10} fill={colors.muted} fontSize={10} fontWeight="700">
          {fmt(maxVal)}
        </SvgText>
        {zeroY != null ? (
          <SvgText x={6} y={zeroY + 4} fill={colors.muted} fontSize={10} fontWeight="700">
            {fmt(0)}
          </SvgText>
        ) : null}
        <SvgText x={6} y={padTop + innerH} fill={colors.muted} fontSize={10} fontWeight="700">
          {fmt(minVal)}
        </SvgText>

        {/* zero line */}
        {zeroY != null ? (
          <Line x1={padLeft} y1={zeroY} x2={padLeft + innerW} y2={zeroY} stroke="#2A2F3A" strokeWidth={1} />
        ) : null}

        {/* trend line */}
        {pathD ? <Path d={pathD} stroke={colors.accent} strokeWidth={2} fill="none" /> : null}

        {/* points + x labels */}
        {points.map((p, i) => {
          const x = xAt(i);
          const y = yAt(p.value);
          const pointColor = p.value >= 0 ? colors.success : colors.danger; // loss (positive) green, gain (negative) red
          const showLabel = i % labelStep === 0 || i === points.length - 1;
          return (
            <React.Fragment key={i}>
              <Circle
                cx={x}
                cy={y}
                r={4}
                fill={pointColor}
                stroke="#0B0C10"
                strokeWidth={2}
                onPress={() => onPointPress?.(i)}
              />
              {showLabel ? (
                <SvgText x={x} y={padTop + innerH + 18} fill={colors.muted} fontSize={10} fontWeight="700" textAnchor="middle">
                  {p.label}
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

