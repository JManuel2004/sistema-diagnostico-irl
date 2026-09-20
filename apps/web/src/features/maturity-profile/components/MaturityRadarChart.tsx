import type { JSX } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type { DimensionCode, DimensionResult, ImbalancePairResult } from '@innlab/contracts';
import { getDimensionVisual, type DimensionVisualMeta } from '@/shared/lib/dimensions';
import {
  buildImbalancedVertices,
  type RadarPoint,
} from '../utils/radar-helpers';

/**
 * Color of the points and of the bottleneck ring. Neutral on purpose: the
 * radar does not color a dimension by its level. Severity that the product
 * defines (the imbalances) comes from the backend and is drawn separately.
 */
const POINT_COLOR = 'var(--color-azul-icesi, #5454E9)';

interface MaturityRadarChartProps {
  dimensionResults: readonly DimensionResult[];
  bottleneckDimensions?: readonly string[];
  imbalances?: readonly ImbalancePairResult[];
}

function asRadarPoints(results: readonly DimensionResult[]): readonly RadarPoint[] {
  return results.map((r) => ({
    dimension: r.shortName,
    code: r.dimensionCode,
    level: r.irlLevel,
    averageLikert: r.averageLikert,
  }));
}

function AxisLabel({
  payload,
  x,
  y,
  textAnchor,
  pointsByCode,
}: {
  payload?: { value?: string };
  x?: number;
  y?: number;
  textAnchor?: 'start' | 'middle' | 'end';
  pointsByCode: Map<string, RadarPoint>;
}): JSX.Element | null {
  const dimensionName = payload?.value;
  if (!dimensionName || x === undefined || y === undefined) return null;

  const point = [...pointsByCode.values()].find((p) => p.dimension === dimensionName);
  if (!point) return null;

  // Unknown codes are not in the map; `getDimensionVisual` yields undefined.
  const visual: DimensionVisualMeta | undefined = getDimensionVisual(point.code as DimensionCode);
  const codeColor = visual?.color ?? '#1A1A24';

  const isTopLabel = point.code === 'TRL';
  const nameOffset = isTopLabel ? -42 : -6;
  const codeOffset = isTopLabel ? -24 : 12;

  return (
    <g>
      <text
        x={x}
        y={y + nameOffset}
        textAnchor={textAnchor}
        className="fill-foreground text-base font-semibold"
      >
        {dimensionName}
      </text>
      <text
        x={x}
        y={y + codeOffset}
        textAnchor={textAnchor}
        className="font-mono text-xs uppercase tracking-widest"
      >
        <tspan fill={codeColor}>{point.code}</tspan>
        <tspan className="fill-muted-foreground"> · </tspan>
        <tspan className="fill-foreground" fontWeight={700}>
          {point.level}
        </tspan>
      </text>
    </g>
  );
}

export function MaturityRadarChart({
  dimensionResults,
  bottleneckDimensions = [],
  imbalances,
}: MaturityRadarChartProps): JSX.Element {
  const points = asRadarPoints(dimensionResults);
  const pointsByCode = new Map(points.map((p) => [p.code, p]));
  const imbalancedVertices = buildImbalancedVertices(imbalances, pointsByCode);

  const accessibleDescription = points
    .map((p) => `${p.dimension}: nivel ${p.level} de 9`)
    .join('. ');

  return (
    <div className="w-full" role="img" aria-label="Perfil IRL — gráfico radar">
      <ResponsiveContainer width="100%" aspect={1} maxHeight={560}>
        <RadarChart data={[...points]} margin={{ top: 80, right: 80, bottom: 40, left: 80 }}>
          <title>Perfil de madurez IRL — gráfico radar</title>
          <desc>{accessibleDescription}</desc>

          <PolarGrid stroke="var(--color-border, #CECFD4)" strokeDasharray="2 2" />

          <PolarAngleAxis
            dataKey="dimension"
            tick={(props: {
              payload?: { value?: string };
              x?: number;
              y?: number;
              textAnchor?: 'start' | 'middle' | 'end';
            }) => <AxisLabel {...props} pointsByCode={pointsByCode} />}
          />

          <PolarRadiusAxis
            angle={90}
            domain={[0, 9]}
            tickCount={4}
            tick={{
              fill: 'var(--color-muted-foreground, #4A4A55)',
              fontSize: 11,
            }}
            stroke="var(--color-border, #CECFD4)"
            axisLine={false}
          />

          <Radar
            name="Nivel IRL"
            dataKey="level"
            stroke="var(--color-azul-icesi, #5454E9)"
            strokeWidth={2}
            fill="var(--color-azul-icesi, #5454E9)"
            fillOpacity={0.2}
            dot={(props: { cx?: number; cy?: number; payload?: RadarPoint; index?: number }) => {
              const { cx, cy, payload, index } = props;
              if (cx === undefined || cy === undefined || !payload) {
                return <g key={`empty-${String(index ?? 0)}`} />;
              }
              const isBottleneck = bottleneckDimensions.includes(payload.code);
              const imbalanceLevel = imbalancedVertices.get(payload.code);
              return (
                <g key={payload.code}>
                  {imbalanceLevel && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={imbalanceLevel === 'critical' ? 13 : 11}
                      fill="none"
                      stroke={imbalanceLevel === 'critical' ? '#D97706' : '#CA8A04'}
                      strokeOpacity={0.7}
                      strokeWidth={2}
                      strokeDasharray={imbalanceLevel === 'critical' ? '3 2' : 'none'}
                    />
                  )}
                  {isBottleneck && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={9}
                      fill="none"
                      stroke={POINT_COLOR}
                      strokeOpacity={0.35}
                      strokeWidth={3}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={POINT_COLOR}
                    stroke="var(--color-background, #FFFFFF)"
                    strokeWidth={1.5}
                  />
                </g>
              );
            }}
            activeDot={false}
            isAnimationActive
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
