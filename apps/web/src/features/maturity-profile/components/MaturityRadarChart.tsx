import { memo, useMemo, type JSX } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type { DimensionCode, DimensionResult, ImbalancePairResult } from '@innlab/contracts';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { Tooltip } from '@/shared/ui/tooltip';
import { PALETTE } from '@/shared/lib/palette';
import { buildImbalancedVertices, type RadarPoint } from '../utils/radar-helpers';
import { DimensionTooltipContent } from './DimensionTooltip';

/**
 * Color of the polygon and of the bottleneck ring: the institutional blue. Each
 * point, in turn, takes the color of its dimension (the same one that colors
 * the dimension everywhere else in the product). Severity that the product
 * defines (the imbalances) comes from the backend and is drawn separately.
 */
const POLYGON_COLOR = PALETTE['azul-icesi'];

/** Chart chrome comes from the same tokens as the rest of the page. */
const GRID_COLOR = 'hsl(var(--border))';
const MUTED_TEXT = 'hsl(var(--muted-foreground))';

interface MaturityRadarChartProps {
  dimensionResults: readonly DimensionResult[];
  bottleneckDimensions?: readonly string[];
  imbalances?: readonly ImbalancePairResult[];
  /**
   * Dimensions to emphasize (a point under the cursor, a summary card). It only
   * sets an attribute on the wrapper; the emphasis itself is CSS
   * (`globals.css`, «Radar emphasis») so the chart is not re-rendered.
   */
  highlighted?: readonly DimensionCode[];
  /** What each dimension measures, from the questionnaire catalog, for the tooltip. */
  descriptions?: Readonly<Partial<Record<DimensionCode, string>>>;
  /** Called with the dimension under the cursor or focused, and with `[]` on leaving. */
  onHover?: (codes: readonly DimensionCode[]) => void;
}

function asRadarPoints(results: readonly DimensionResult[]): readonly RadarPoint[] {
  return results.map((r) => ({
    dimension: r.shortName,
    code: r.dimensionCode,
    level: r.irlLevel,
    levelDescription: r.levelDescription,
  }));
}

interface TipProps {
  readonly point: RadarPoint;
  readonly description?: string;
  readonly onHover?: (codes: readonly DimensionCode[]) => void;
  readonly focusable?: boolean;
  readonly children: JSX.Element;
}

/**
 * A point of the radar with its explanation. Hovering (or, on the points,
 * focusing with the keyboard) shows a tooltip about the dimension and
 * highlights it. The tooltip is a Radix one: its content is portaled to the
 * page, so it is ordinary HTML even though the trigger lives in the SVG.
 */
function DimensionTip({ point, description, onHover, focusable, children }: TipProps): JSX.Element {
  const code = point.code as DimensionCode;
  return (
    <Tooltip
      content={
        <DimensionTooltipContent
          code={code}
          name={point.dimension}
          level={point.level}
          description={description}
          levelDescription={point.levelDescription ?? null}
        />
      }
    >
      <g
        className="cursor-help outline-none"
        tabIndex={focusable ? 0 : undefined}
        aria-label={focusable ? `${point.dimension}: nivel ${String(point.level)} de 9` : undefined}
        onMouseEnter={() => {
          onHover?.([code]);
        }}
        onMouseLeave={() => {
          onHover?.([]);
        }}
        onFocus={() => {
          onHover?.([code]);
        }}
        onBlur={() => {
          onHover?.([]);
        }}
      >
        {children}
      </g>
    </Tooltip>
  );
}

interface AxisLabelProps {
  payload?: { value?: unknown };
  x?: number | string;
  y?: number | string;
  textAnchor?: string;
  pointsByCode: Map<string, RadarPoint>;
  descriptions: MaturityRadarChartProps['descriptions'];
  onHover: MaturityRadarChartProps['onHover'];
}

function AxisLabel({
  payload,
  x,
  y,
  textAnchor,
  pointsByCode,
  descriptions,
  onHover,
}: AxisLabelProps): JSX.Element | null {
  const dimensionName = typeof payload?.value === 'string' ? payload.value : undefined;
  if (!dimensionName || x === undefined || y === undefined) return null;
  const px = Number(x);
  const py = Number(y);

  const point = [...pointsByCode.values()].find((p) => p.dimension === dimensionName);
  if (!point) return null;

  const code = point.code as DimensionCode;
  const visual = getDimensionVisual(code);

  const isTopLabel = point.code === 'TRL';
  const nameOffset = isTopLabel ? -40 : -6;
  const levelOffset = isTopLabel ? -20 : 14;
  const anchor = textAnchor === 'start' || textAnchor === 'end' ? textAnchor : 'middle';

  return (
    <DimensionTip point={point} description={descriptions?.[code]} onHover={onHover}>
      <g data-dim={code}>
        <text
          x={px}
          y={py + nameOffset}
          textAnchor={anchor}
          fill={visual.color}
          className="radar-label-name text-base font-bold"
        >
          {point.code}
        </text>
        <text
          x={px}
          y={py + levelOffset}
          textAnchor={anchor}
          className="fill-foreground text-sm font-semibold"
        >
          Nivel {point.level}
        </text>
      </g>
    </DimensionTip>
  );
}

const NO_BOTTLENECK: readonly string[] = [];

interface RadarCanvasProps {
  readonly points: readonly RadarPoint[];
  readonly bottleneckDimensions: readonly string[];
  readonly imbalances: MaturityRadarChartProps['imbalances'];
  readonly descriptions: MaturityRadarChartProps['descriptions'];
  readonly onHover: MaturityRadarChartProps['onHover'];
}

/**
 * The chart itself. Memoized so it draws once: none of its props change with
 * the hover (the emphasis is CSS), which is what keeps a point, and the
 * tooltip open over it, from being torn down while the cursor is on it.
 */
const RadarCanvas = memo(function RadarCanvas({
  points,
  bottleneckDimensions,
  imbalances,
  descriptions,
  onHover,
}: RadarCanvasProps): JSX.Element {
  const pointsByCode = new Map(points.map((p) => [p.code, p]));
  const imbalancedVertices = buildImbalancedVertices(imbalances, pointsByCode);

  const accessibleDescription = points
    .map((p) => `${p.dimension}: nivel ${String(p.level)} de 9`)
    .join('. ');

  return (
    <ResponsiveContainer width="100%" aspect={1} maxHeight={560}>
      <RadarChart
        data={points}
        outerRadius="92%"
        margin={{ top: 64, right: 96, bottom: 56, left: 96 }}
      >
        <title>Perfil de madurez IRL — gráfico radar</title>
        <desc>{accessibleDescription}</desc>

        <PolarGrid stroke={GRID_COLOR} strokeDasharray="2 2" />

        <PolarAngleAxis
          dataKey="dimension"
          tick={({ payload, x, y, textAnchor }) => (
            <AxisLabel
              payload={payload}
              x={x}
              y={y}
              textAnchor={textAnchor}
              pointsByCode={pointsByCode}
              descriptions={descriptions}
              onHover={onHover}
            />
          )}
        />

        <PolarRadiusAxis
          angle={90}
          domain={[0, 9]}
          tickCount={4}
          tick={{
            fill: MUTED_TEXT,
            fontSize: 12,
          }}
          stroke={GRID_COLOR}
          axisLine={false}
        />

        <Radar
          name="Nivel IRL"
          dataKey="level"
          stroke={POLYGON_COLOR}
          strokeWidth={2}
          fill={POLYGON_COLOR}
          fillOpacity={0.2}
          dot={(props: { cx?: number; cy?: number; payload?: RadarPoint; index?: number }) => {
            const { cx, cy, payload, index } = props;
            if (cx === undefined || cy === undefined || !payload) {
              return <g key={`empty-${String(index ?? 0)}`} />;
            }
            const code = payload.code as DimensionCode;
            const visual = getDimensionVisual(code);
            const isBottleneck = bottleneckDimensions.includes(payload.code);
            const imbalanceLevel = imbalancedVertices.get(payload.code);
            return (
              <g key={payload.code} data-dim={code}>
                <DimensionTip
                  point={payload}
                  description={descriptions?.[code]}
                  onHover={onHover}
                  focusable
                >
                  <g>
                    {/* Generous invisible target: the point itself is small. */}
                    <circle cx={cx} cy={cy} r={18} fill="transparent" />
                    <circle
                      className="radar-ring"
                      cx={cx}
                      cy={cy}
                      r={13}
                      fill="none"
                      stroke={visual.color}
                      strokeWidth={3}
                    />
                    {imbalanceLevel && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={imbalanceLevel === 'critical' ? 15 : 13}
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
                        r={11}
                        fill="none"
                        stroke={POLYGON_COLOR}
                        strokeOpacity={0.35}
                        strokeWidth={3}
                      />
                    )}
                    <circle
                      className="radar-dot"
                      cx={cx}
                      cy={cy}
                      r={7}
                      fill={visual.fill}
                      stroke={visual.color}
                      strokeWidth={2}
                    />
                  </g>
                </DimensionTip>
              </g>
            );
          }}
          activeDot={false}
          isAnimationActive
        />
      </RadarChart>
    </ResponsiveContainer>
  );
});

export function MaturityRadarChart({
  dimensionResults,
  bottleneckDimensions = NO_BOTTLENECK,
  imbalances,
  highlighted = [],
  descriptions,
  onHover,
}: MaturityRadarChartProps): JSX.Element {
  // `points` keeps its identity while the results do: recharts restarts the
  // animation, and remounts every point, whenever it receives a new array.
  const points = useMemo(() => asRadarPoints(dimensionResults), [dimensionResults]);

  return (
    // `group`, not `img`: an image role would hide the focusable points from assistive tech.
    <div
      className="radar-emphasis w-full"
      role="group"
      aria-label="Perfil IRL — gráfico radar"
      data-highlighted={highlighted.join(' ')}
    >
      <RadarCanvas
        points={points}
        bottleneckDimensions={bottleneckDimensions}
        imbalances={imbalances}
        descriptions={descriptions}
        onHover={onHover}
      />
    </div>
  );
}
