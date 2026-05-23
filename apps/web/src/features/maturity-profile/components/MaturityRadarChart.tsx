import type { JSX } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type { DimensionResult } from '@innlab/contracts';

/**
 * Etiqueta humana en español para cada dimensión IRL. Per DESIGN.md la
 * etiqueta del eje del radar lleva el nombre legible — el código (TRL,
 * CRL...) se renderiza junto con el nivel en estilo `overline`.
 */
const DIMENSION_NAME_ES: Record<string, string> = {
  TRL: 'Tecnología',
  CRL: 'Cliente',
  BRL: 'Negocio',
  IPRL: 'Propiedad Intelectual',
  TmRL: 'Equipo',
  FRL: 'Financiación',
};

/**
 * Color "por dimensión" per DESIGN.md → "IRL dimension palette". Se usa
 * en el código de la dimensión (overline) para que cada eje conserve
 * su identidad visual incluso si todas tuvieran el mismo nivel.
 */
const DIMENSION_COLOR: Record<string, string> = {
  TRL: 'var(--color-dimension-trl, #5454E9)',
  CRL: 'var(--color-dimension-crl, #5832B0)',
  BRL: 'var(--color-dimension-brl, #1F633D)',
  IPRL: 'var(--color-dimension-iprl, #3D3D5C)',
  TmRL: 'var(--color-dimension-tmrl, #8C3811)',
  FRL: 'var(--color-dimension-frl, #5C4A1A)',
};

/**
 * Color "por nivel IRL" extendido desde la paleta semántica de DESIGN.md
 * (originalmente ligada a desequilibrios — RF-10). Acá la reusamos como
 * señal de severidad absoluta para el VALOR numérico del nivel:
 *   - 1-3 → crítico (atención inmediata)
 *   - 4-5 → moderado
 *   - 6-9 → aceptable
 * Esta categorización proviene de la guía KTH (página 4 del PDF
 * "Cuestionario KTH IRL"): "🔴 IRL 1–3 en cualquier dimensión: señal de
 * prioridad máxima".
 */
function severityColorForLevel(level: number): string {
  if (level <= 3) return 'var(--color-critical, #A53221)';
  if (level <= 5) return 'var(--color-moderate, #8C3811)';
  return 'var(--color-acceptable, #1F633D)';
}

interface MaturityRadarChartProps {
  /** Los 6 resultados dimensionales tal como vienen del backend (DIAGIRL-34). */
  dimensionResults: readonly DimensionResult[];
  /**
   * Códigos de dimensión marcados como cuello de botella (DIAGIRL-35).
   * Llega vacío hasta que esa HU esté lista. Cuando llegue, los vértices
   * correspondientes se resaltan con un anillo.
   */
  bottleneckDimensions?: readonly string[];
}

interface RadarPoint {
  /** Display name (Spanish) shown around the chart. */
  dimension: string;
  /** Dimension code (TRL, CRL, ...) — used internally for coloring + lookups. */
  code: string;
  /** Computed IRL level, 1..9. */
  level: number;
  /** Original Likert average (kept so the tooltip can show it if added later). */
  averageLikert: number;
}

function asRadarPoints(results: readonly DimensionResult[]): readonly RadarPoint[] {
  return results.map((r) => ({
    dimension: DIMENSION_NAME_ES[r.dimensionCode] ?? r.dimensionCode,
    code: r.dimensionCode,
    level: r.irlLevel,
    averageLikert: r.averageLikert,
  }));
}

/**
 * Tick personalizado del `PolarAngleAxis`. Renderiza:
 *   - El nombre de la dimensión en español (h4-ish, semibold).
 *   - El código + nivel en estilo `overline` (uppercase, tracked).
 *   - Color del código = color de la dimensión (DESIGN.md dimension
 *     palette). Color del nivel = color por severidad (≤3, 4-5, ≥6).
 */
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

  // Recharts gives us the rendered name; reverse-lookup the data point.
  const point = [...pointsByCode.values()].find((p) => p.dimension === dimensionName);
  if (!point) return null;

  const codeColor = DIMENSION_COLOR[point.code] ?? '#1A1A24';
  const levelColor = severityColorForLevel(point.level);

  // Extra clearance for the TOP label (TRL) so it doesn't visually merge
  // with the topmost radial tick. The other dimensions sit on the sides
  // and bottom where no vertical stack of radius ticks competes for the
  // same column of pixels, so they keep the tighter default spacing.
  const isTopLabel = point.code === 'TRL';
  const nameOffset = isTopLabel ? -18 : -6;
  const codeOffset = isTopLabel ? 0 : 12;

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
        <tspan fill={levelColor} fontWeight={700}>
          {point.level}
        </tspan>
      </text>
    </g>
  );
}

/**
 * Radar de madurez IRL (DIAGIRL-36).
 *
 * 6 ejes (uno por dimensión IRL), escala 1-9. El polígono se rellena con
 * Azul Icesi al 20% de alpha y se traza con 2px de Azul Icesi al 100%
 * — per DESIGN.md "single shape, single fill" (la firma visual del
 * marco KTH).
 *
 * Etiquetas: nombre en español + código (DESIGN.md dimension palette) +
 * nivel (severidad por umbral KTH). Esto cumple los 3 criterios de la
 * HU-36:
 *   - 6 ejes uno por dimensión ✓
 *   - Vértices ubicados en su nivel 1-9 ✓
 *   - Nombres de dimensiones visibles ✓
 *
 * Accesibilidad: el SVG raíz lleva `<title>` y `<desc>` para que lectores
 * de pantalla narren el perfil sin depender del visual (DESIGN.md a11y).
 *
 * DIAGIRL-35-ready: la prop opcional `bottleneckDimensions` se acepta
 * pero hoy no altera el render. Cuando aterrice esa HU, el componente
 * la usará para resaltar los vértices correspondientes sin cambios
 * estructurales.
 */
export function MaturityRadarChart({
  dimensionResults,
  bottleneckDimensions = [],
}: MaturityRadarChartProps): JSX.Element {
  const points = asRadarPoints(dimensionResults);
  const pointsByCode = new Map(points.map((p) => [p.code, p]));

  const accessibleDescription = points
    .map((p) => `${p.dimension}: nivel ${p.level} de 9`)
    .join('. ');

  return (
    <div className="w-full" role="img" aria-label="Perfil IRL — gráfico radar">
      <ResponsiveContainer width="100%" aspect={1} maxHeight={560}>
        <RadarChart data={[...points]} margin={{ top: 56, right: 80, bottom: 40, left: 80 }}>
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

          {/*
            angle={30} sitúa los ticks 0/3/6/9 en la diagonal entre TRL
            (90°) y CRL (-30° → arriba a la derecha), de modo que no se
            apilan sobre la línea vertical del eje superior y dejan de
            chocar visualmente con el label "Tecnología".
          */}
          <PolarRadiusAxis
            angle={30}
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
              const dotColor = severityColorForLevel(payload.level);
              const isBottleneck = bottleneckDimensions.includes(payload.code);
              return (
                <g key={payload.code}>
                  {isBottleneck && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={9}
                      fill="none"
                      stroke={dotColor}
                      strokeOpacity={0.35}
                      strokeWidth={3}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={dotColor}
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
