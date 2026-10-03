import type { JSX, ReactNode } from 'react';
import {
  BookOpen,
  CircleCheck,
  Compass,
  Layers,
  Lightbulb,
  OctagonAlert,
  Route,
  Scale,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type {
  DiagnosticReport,
  DimensionCode,
  ImbalanceClassification,
  RoadmapPhase,
} from '@innlab/contracts';
import { Badge } from '@/shared/ui/badge';
import { DimensionChip } from '@/shared/ui/dimension-chip';
import { LevelBar } from '@/shared/ui/level-bar';
import { SectionHeader } from '@/shared/ui/section-header';
import { ServiceDetails } from '@/shared/ui/service-details';
import { getDimensionVisual } from '@/shared/lib/dimensions';
import { formatDateTime, formatOneDecimal } from '@/shared/lib/format';
import {
  CLASSIFICATION_LABEL,
  SEVERITY_ORDER,
  inclusionSentence,
  levelWord,
  listNames,
  namesOf,
} from '../lib/report-text';

/**
 * The full report of a diagnostic, as a document (RF-16 / HU-23): the
 * initiative, the profile of six dimensions, the gaps and alerts, the
 * INNLAB recommendation, the roadmap and the attribution of the KTH
 * framework. It is what the leader reviews before downloading it, so it
 * reads top to bottom with no interaction: nothing folds, nothing needs a
 * pointer.
 *
 * Every value comes in the report, computed by the backend; this component
 * only lays it out.
 */
interface Props {
  readonly report: DiagnosticReport;
}

export function ReportDocument({ report }: Props): JSX.Element {
  const names: Partial<Record<DimensionCode, string>> = Object.fromEntries(
    report.profile.dimensionResults.map((r) => [r.dimensionCode, r.shortName]),
  );

  return (
    <article
      aria-label={`Reporte completo de ${report.initiative.name}`}
      className="flex flex-col gap-14 sm:gap-20"
    >
      <InitiativeSection report={report} />
      <ProfileSection report={report} names={names} />
      <AlertsSection report={report} names={names} />
      <RecommendationSection report={report} />
      <RoadmapSection report={report} names={names} />
      <AttributionSection report={report} />
    </article>
  );
}

type Names = Readonly<Partial<Record<DimensionCode, string>>>;

function ReportSection({
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
    <section aria-labelledby={id}>
      <SectionHeader id={id} icon={icon} title={title} description={description} />
      {children}
    </section>
  );
}

function InitiativeSection({ report }: { readonly report: DiagnosticReport }): JSX.Element {
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

function ProfileSection({
  report,
  names,
}: {
  readonly report: DiagnosticReport;
  readonly names: Names;
}): JSX.Element {
  const p = report.profile;
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

      <ul aria-label="Nivel de cada dimensión" className="mt-6 flex flex-col">
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

const SEVERITY_ICON: Readonly<Record<ImbalanceClassification, LucideIcon>> = {
  critical: OctagonAlert,
  moderate: TriangleAlert,
  acceptable: CircleCheck,
};

const SEVERITY_TONE: Readonly<
  Record<ImbalanceClassification, 'critical' | 'moderate' | 'acceptable'>
> = {
  critical: 'critical',
  moderate: 'moderate',
  acceptable: 'acceptable',
};

function AlertsSection({
  report,
  names,
}: {
  readonly report: DiagnosticReport;
  readonly names: Names;
}): JSX.Element {
  const p = report.profile;
  const pairs = [...(p.imbalances ?? [])].sort(
    (a, b) => SEVERITY_ORDER[a.classification] - SEVERITY_ORDER[b.classification],
  );
  return (
    <ReportSection
      id="report-alerts"
      icon={Scale}
      title="Brechas, alertas y desequilibrios"
      description="Dónde la iniciativa está más rezagada y qué tan parejo avanzan las dimensiones que deben crecer juntas."
    >
      <div className="flex flex-col gap-8">
        <div>
          <h3 className="text-foreground text-lg font-bold">Brechas</h3>
          <p className="text-foreground mt-2 text-base">
            {p.gaps.dimensions.length === 0
              ? `Ninguna dimensión está en brecha (nivel ${String(p.gaps.threshold)} o menos).`
              : `${namesOf(p.gaps.dimensions, names)} ${p.gaps.dimensions.length === 1 ? 'está' : 'están'} en brecha: nivel ${String(p.gaps.threshold)} o menos.`}
          </p>
        </div>

        <div>
          <h3 className="text-foreground text-lg font-bold">Alertas de estado crítico</h3>
          {p.criticalState.dimensions.length === 0 ? (
            <p className="text-foreground mt-2 text-base">
              Ninguna dimensión clave (cliente, negocio o equipo) está en estado crítico.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {p.criticalState.dimensions.map((code) => (
                <li
                  key={code}
                  className="border-border border-t-critical flex items-start gap-3 border border-t-[3px] p-4"
                >
                  <OctagonAlert
                    className="text-critical mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-foreground text-base">
                    <span className="font-bold">{names[code] ?? code} está en estado crítico.</span>{' '}
                    Es una dimensión clave y está en brecha: necesita atención primero.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {pairs.length > 0 && (
          <div>
            <h3 className="text-foreground text-lg font-bold">Desequilibrios entre dimensiones</h3>
            <ul className="border-border mt-3 flex flex-col border-t">
              {pairs.map((pair) => {
                const Icon = SEVERITY_ICON[pair.classification];
                return (
                  <li
                    key={`${pair.left}-${pair.right}`}
                    className="border-border flex flex-wrap items-center justify-between gap-3 border-b py-3"
                  >
                    <span className="text-foreground text-base">
                      <span className="font-semibold">
                        {listNames([
                          names[pair.left] ?? pair.left,
                          names[pair.right] ?? pair.right,
                        ])}
                      </span>
                      <span className="text-muted-foreground">
                        {' '}
                        · {levelWord(pair.difference)} de diferencia
                      </span>
                    </span>
                    <Badge tone={SEVERITY_TONE[pair.classification]}>
                      <Icon className="size-4" aria-hidden="true" />
                      {CLASSIFICATION_LABEL[pair.classification]}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </ReportSection>
  );
}

function RecommendationSection({ report }: { readonly report: DiagnosticReport }): JSX.Element {
  const r = report.recommendation;
  return (
    <ReportSection
      id="report-recommendation"
      icon={Compass}
      title="Recomendación del portafolio INNLAB"
      description="El servicio de INNLAB que mejor corresponde al estado actual de la iniciativa, y por qué."
    >
      {r.primary ? (
        <div className="border-border border-t-azul-icesi border border-t-[3px] p-5 sm:p-6">
          <h3 className="text-h3 text-foreground">{r.primary.name}</h3>
          <p className="text-muted-foreground mt-1 text-base">{r.primary.subtitle}</p>
          <div className="mt-4">
            <ServiceDetails service={r.primary} />
          </div>
          {r.justification && (
            <div className="border-border mt-5 border-t pt-4">
              <h4 className="text-foreground text-base font-bold">Por qué este servicio</h4>
              <p className="text-foreground mt-1 text-base leading-relaxed">{r.justification}</p>
            </div>
          )}
          {r.primary.adjustmentReason && (
            <p className="text-muted-foreground mt-3 text-sm">
              El centro lo sugiere: {r.primary.adjustmentReason}
            </p>
          )}
        </div>
      ) : (
        <p className="border-border text-foreground border p-5 text-base">
          {r.noRecommendationReason ?? 'Ningún servicio del portafolio corresponde a este perfil.'}
        </p>
      )}
      {r.alternatives.length > 0 && (
        <p className="text-foreground mt-4 text-base">
          <span className="font-semibold">Otras opciones del portafolio:</span>{' '}
          {listNames(r.alternatives.map((a) => a.name))}.
        </p>
      )}
    </ReportSection>
  );
}

function RoadmapSection({
  report,
  names,
}: {
  readonly report: DiagnosticReport;
  readonly names: Names;
}): JSX.Element {
  const roadmap = report.roadmap;
  const levels = Object.fromEntries(
    report.profile.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
  ) as Partial<Record<DimensionCode, number>>;
  return (
    <ReportSection
      id="report-roadmap"
      icon={Route}
      title="Roadmap de escalamiento"
      description="Las fases en que conviene trabajar las dimensiones y el servicio de INNLAB que podría acompañar cada una, de lo más liviano a lo más profundo."
    >
      {roadmap.phases.length === 0 ? (
        <p className="text-foreground text-base">
          Todas las dimensiones alcanzan el nivel que se espera de ellas: no hace falta una ruta de
          escalamiento.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {roadmap.phases.map((phase) => (
            <PhaseItem key={phase.order} phase={phase} />
          ))}
        </ol>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {roadmap.dimensionsWithoutIntervention.length > 0 && (
          <p className="text-foreground text-base">
            <span className="font-semibold">Sin intervención:</span>{' '}
            {listNames(roadmap.dimensionsWithoutIntervention.map((d) => d.shortName))}{' '}
            {roadmap.dimensionsWithoutIntervention.length === 1 ? 'ya alcanza' : 'ya alcanzan'} lo
            esperado.
          </p>
        )}
        {roadmap.phases.length > 0 && (
          <div>
            <h3 className="text-foreground text-lg font-bold">Al terminar la ruta</h3>
            <ul
              aria-label="Nivel de cada dimensión hoy y al terminar la ruta"
              className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2"
            >
              {(Object.keys(roadmap.finalLevels) as DimensionCode[]).map((code) => (
                <li key={code} className="text-foreground text-base">
                  <span className="font-semibold">{names[code] ?? code}:</span> nivel {levels[code]}{' '}
                  hoy, nivel {roadmap.finalLevels[code]} al final
                </li>
              ))}
            </ul>
            <p className="text-foreground mt-3 text-base">
              {roadmap.balanced
                ? 'Al terminar, ningún par de dimensiones queda con un desequilibrio con alerta.'
                : 'Al terminar, todavía queda algún par de dimensiones con un desequilibrio con alerta.'}
            </p>
          </div>
        )}
      </div>
    </ReportSection>
  );
}

function PhaseItem({ phase }: { readonly phase: RoadmapPhase }): JSX.Element {
  const id = `report-phase-${String(phase.order)}`;
  return (
    <li aria-labelledby={id} className="border-border border p-5 sm:p-6">
      <h3 id={id} className="text-h3 text-foreground">
        Fase {phase.order}
      </h3>
      <p className="text-foreground mt-2 text-base">
        <span className="font-semibold">Servicio:</span>{' '}
        {phase.service ? (
          <>
            {phase.service.name} ({phase.service.tier.name})
            {phase.service.approximate && (
              <span className="text-muted-foreground">
                {' '}
                · el más cercano disponible: ninguno alcanza el mínimo para esta fase
              </span>
            )}
          </>
        ) : (
          'ninguno del portafolio corresponde a esta fase'
        )}
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {phase.dimensions.map((d) => (
          <li key={d.dimensionCode} className="border-border border-t pt-3">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <DimensionChip code={d.dimensionCode} name={d.shortName} />
              <span className="text-foreground text-base font-semibold">
                Del nivel {d.currentLevel} al {d.targetLevel}
              </span>
              {d.targetLevel < d.finalTargetLevel && (
                <span className="text-muted-foreground text-sm">
                  sigue en la próxima fase hasta el {d.finalTargetLevel}
                </span>
              )}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">{inclusionSentence(d)}</p>
          </li>
        ))}
      </ul>
    </li>
  );
}

function AttributionSection({ report }: { readonly report: DiagnosticReport }): JSX.Element {
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
