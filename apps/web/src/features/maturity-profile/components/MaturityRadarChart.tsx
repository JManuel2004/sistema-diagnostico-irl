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
import { PALETTE } from '@/shared/lib/palette';
import { buildImbalancedVertices, dotStyle, type RadarPoint } from '../utils/radar-helpers';

/**
 * Color of the points and of the bottleneck ring. Neutral on purpose: the
 * radar does not color a dimension by its level. Severity that the product
 * defines (the imbalances) comes from the backend and is drawn separately.
 */
const POINT_COLOR = PALETTE['azul-icesi'];

/** Chart chrome comes from the same tokens as the rest of the page. */
const GRID_COLOR = 'hsl(var(--border))';
const MUTED_TEXT = 'hsl(var(--muted-foreground))';
const BACKGROUND = 'hsl(var(--background))';

interface MaturityRadarChartProps {
  dimensionResults: readonly DimensionResult[];
  bottleneckDimensions?: readonly string[];
  imbalances?: readonly ImbalancePairResult[];
  /** Dimensions to emphasize (legend, summary cards); see `effectiveHighlight`. */
  highlighted?: readonly DimensionCode[];
}

function asRadarPoints(results: readonly DimensionResult[]): readonly RadarPoint[] {
  return results.map((r) => ({
    dimension: r.shortName,
    code: r.dimensionCode,
    level: r.irlLevel,
    averageLikert: r.averageLikert,
  }));
}

interface AxisLabelProps {
  payload?: { value?: unknown };
  x?: number | string;
  y?: number | string;
  textAnchor?: string;
  pointsByCode: Map<string, RadarPoint>;
  highlighted: readonly DimensionCode[];
}

function AxisLabel({
  payload,
  x,
  y,
  textAnchor,
  pointsByCode,
  highlighted,
}: AxisLabelProps): JSX.Element | null {
  const dimensionName = typeof payload?.value === 'string' ? payload.value : undefined;
  if (!dimensionName || x === undefined || y === undefined) return null;
  const px = Number(x);
  const py = Number(y);

  const point = [...pointsByCode.values()].find((p) => p.dimension === dimensionName);
  if (!point) return null;

  // Unknown codes are not in the map; `getDimensionVisual` yields undefined.
  const visual: DimensionVisualMeta | undefined = getDimensionVisual(point.code as DimensionCode);
  const codeColor = visual?.color ?? 'hsl(var(--foreground))';

  const isTopLabel = point.code === 'TRL';
  const nameOffset = isTopLabel ? -42 : -6;
  const codeOffset = isTopLabel ? -24 : 12;

  const isHighlighted = highlighted.includes(point.code as DimensionCode);
  const receded = highlighted.length > 0 && !isHighlighted;
  const anchor = textAnchor === 'start' || textAnchor === 'end' ? textAnchor : 'middle';

  return (
    <g opacity={receded ? 0.5 : 1}>
      <text
        x={px}
        y={py + nameOffset}
        textAnchor={anchor}
        className={`fill-foreground text-base ${isHighlighted ? 'font-bold' : 'font-semibold'}`}
      >
        {dimensionName}
      </text>
      <text
        x={px}
        y={py + codeOffset}
        textAnchor={anchor}
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
  highlighted = [],
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

          <PolarGrid stroke={GRID_COLOR} strokeDasharray="2 2" />

          <PolarAngleAxis
            dataKey="dimension"
            tick={(props) => (
              <AxisLabel
                payload={props.payload as AxisLabelProps['payload']}
                x={props.x}
                y={props.y}
                textAnchor={props.textAnchor}
                pointsByCode={pointsByCode}
                highlighted={highlighted}
              />
            )}
          />

          <PolarRadiusAxis
            angle={90}
            domain={[0, 9]}
            tickCount={4}
            tick={{
              fill: MUTED_TEXT,
              fontSize: 11,
            }}
            stroke={GRID_COLOR}
            axisLine={false}
          />

          <Radar
            name="Nivel IRL"
            dataKey="level"
            stroke={POINT_COLOR}
            strokeWidth={2}
            fill={POINT_COLOR}
            fillOpacity={0.2}
            dot={(props: { cx?: number; cy?: number; payload?: RadarPoint; index?: number }) => {
              const { cx, cy, payload, index } = props;
              if (cx === undefined || cy === undefined || !payload) {
                return <g key={`empty-${String(index ?? 0)}`} />;
              }
              const isBottleneck = bottleneckDimensions.includes(payload.code);
              const style = dotStyle(
                highlighted.includes(payload.code as DimensionCode),
                highlighted.length > 0,
              );
              const ringColor =
                getDimensionVisual(payload.code as DimensionCode)?.color ?? POINT_COLOR;
              const imbalanceLevel = imbalancedVertices.get(payload.code);
              return (
                <g key={payload.code} opacity={style.opacity}>
                  {style.ringWidth > 0 && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={style.radius + 4}
                      fill="none"
                      stroke={ringColor}
                      strokeWidth={style.ringWidth}
                    />
                  )}
                  {imbalanceLevel && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={imbalanceLevel === 'critical' ? 13 : 11}
                      fill="none"
                      stroke={
                        imbalanceLevel === 'critical'
                          ? PALETTE.critical.DEFAULT
                          : PALETTE.moderate.DEFAULT
                      }
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
                    r={style.radius}
                    fill={POINT_COLOR}
                    stroke={BACKGROUND}
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
