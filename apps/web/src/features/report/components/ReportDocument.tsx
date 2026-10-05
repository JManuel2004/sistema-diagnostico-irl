import type { JSX, ReactNode } from 'react';
import { BookOpen, Layers, Lightbulb, type LucideIcon } from 'lucide-react';
import type { DiagnosticReport, DimensionCode } from '@innlab/contracts';
import { DimensionChip } from '@/shared/ui/dimension-chip';
import { LevelBar } from '@/shared/ui/level-bar';
import { SectionHeader } from '@/shared/ui/section-header';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { formatDateTime, formatOneDecimal } from '@/shared/lib/format';
import { namesOf } from '../lib/report-text';

/**
 * The sections of the full report that only the report has (RF-16 /
 * HU-23): the initiative, the meaning of each level and the attribution of
 * the KTH framework. The page composes them with the interactive pieces the
 * results already have (the radar, the pairs, the service and the route),
 * which belong to other features, and with the answers (`ReportAnswers`).
 *
 * Every value comes in the report, computed by the backend; these
 * components only lay it out.
 */

/** A section of the report: a landmark with its `h2`, its icon and its text. */
export function ReportSection({
  id,
  icon,
  title,
  description,
  children,
}: {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-40">
      <SectionHeader id={`${id}-title`} icon={icon} title={title} description={description} />
      {children}
    </section>
  );
}

interface Props {
  readonly report: DiagnosticReport;
}

export function ReportInitiativeSection({ report }: Props): JSX.Element {
  const i = report.initiative;
  const rows: readonly [string, string][] = [
    ['Nombre', i.name],
    ['Sector', i.sector.name],
    ['Producto o servicio', i.productType],
    ['Etapa', `${i.stage.name}. ${i.declaredStage}`],
    [
      'Equipo',
      `${String(i.teamSize)} ${i.teamSize === 1 ? 'persona' : 'personas'}. ${i.teamDescription}`,
    ],
    ['Mercado objetivo', i.targetMarket],
    ['Financiamiento actual', i.currentFunding],
  ];
  return (
    <ReportSection id="report-initiative" icon={Lightbulb} title="Datos de la iniciativa">
      <dl className="border-border grid border-t sm:grid-cols-[14rem_1fr]">
        {rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-muted-foreground border-border pt-3 text-sm font-semibold sm:border-b sm:py-3">
              {term}
            </dt>
            <dd className="text-foreground border-border border-b pb-3 text-base sm:py-3">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </ReportSection>
  );
}

/**
 * The profile: the global level and the strongest and weakest dimensions,
 * the chart the page passes (`children`, the radar of the results), and what
 * each of the six levels means.
 */
export function ReportProfileSection({
  report,
  children,
}: Props & { readonly children?: ReactNode }): JSX.Element {
  const p = report.profile;
  const names: Partial<Record<DimensionCode, string>> = Object.fromEntries(
    p.dimensionResults.map((r) => [r.dimensionCode, r.shortName]),
  );
  return (
    <ReportSection
      id="report-profile"
      icon={Layers}
      title="Perfil de seis dimensiones"
      description="El nivel de madurez de la iniciativa en cada dimensión del marco IRL, en una escala de 1 a 9."
    >
      <div className="border-border grid gap-4 border p-5 sm:grid-cols-3 sm:p-6">
        <div>
          <p className="text-muted-foreground text-sm font-semibold">Nivel IRL global</p>
          <p className="text-foreground mt-1 text-3xl font-extrabold tabular-nums">
            {formatOneDecimal(p.globalAverage)}{' '}
            <span className="text-muted-foreground text-base font-semibold">de 9</span>
          </p>
          {p.globalLevel.description && (
            <p className="text-muted-foreground mt-1 text-sm">{p.globalLevel.description}</p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground text-sm font-semibold">Dimensión más fuerte</p>
          <p className="text-foreground mt-1 text-base font-semibold">
            {namesOf(p.strength.dimensions, names)} · nivel {p.strength.level}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm font-semibold">Cuello de botella</p>
          <p className="text-foreground mt-1 text-base font-semibold">
            {namesOf(p.bottleneck.dimensions, names)} · nivel {p.bottleneck.level}
          </p>
        </div>
      </div>

      {children && <div className="mt-8">{children}</div>}

      <h3 className="text-foreground mt-10 text-lg font-bold">Qué significa cada nivel</h3>
      <ul aria-label="Nivel de cada dimensión" className="mt-2 flex flex-col">
        {p.dimensionResults.map((r) => {
          const visual = getDimensionVisual(r.dimensionCode);
          return (
            <li
              key={r.dimensionCode}
              className="border-border grid gap-3 border-b py-4 sm:grid-cols-[16rem_1fr] sm:gap-6"
            >
              <div className="flex flex-col gap-2">
                <DimensionChip code={r.dimensionCode} name={r.name} className="self-start" />
                <p className="text-foreground text-sm">
                  <span className="text-lg font-extrabold tabular-nums">Nivel {r.irlLevel}</span> de
                  9
                  <span className="text-muted-foreground">
                    {' '}
                    · promedio {formatOneDecimal(r.averageLikert)} de 5
                  </span>
                </p>
                <LevelBar level={r.irlLevel} fillClass={visual.bg} />
              </div>
              <p className="text-foreground text-sm leading-relaxed sm:text-base">
                {r.levelDescription ?? 'Sin descripción para este nivel.'}
              </p>
            </li>
          );
        })}
      </ul>
    </ReportSection>
  );
}

export function ReportAttributionSection({ report }: Props): JSX.Element {
  const a = report.attribution;
  return (
    <ReportSection id="report-attribution" icon={BookOpen} title="Marco de referencia">
      <div className="border-border border p-5 text-base sm:p-6">
        <p className="text-foreground">
          Este diagnóstico aplica el marco <span className="font-semibold">{a.framework}</span>, de{' '}
          {a.owner} (versión {report.frameworkVersion}). El análisis profundo se completó el{' '}
          {formatDateTime(report.completedAt)}.
        </p>
        <p className="text-foreground mt-3 font-semibold">{a.notice}</p>
        <p className="mt-1">
          <a
            href={a.licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary text-sm underline-offset-4 hover:underline"
          >
            Ver la licencia {a.license}
          </a>
        </p>
      </div>
    </ReportSection>
  );
}
