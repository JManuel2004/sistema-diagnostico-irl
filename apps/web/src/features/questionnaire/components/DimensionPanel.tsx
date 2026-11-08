import type { DimensionCode, DimensionWithStatements } from '@innlab/contracts';
import { StatementCard } from './StatementCard';
import { getDimensionVisual } from '@/shared/lib/dimensions';

/**
 * Panel of an IRL dimension — sticky sidebar with context + the list of
 * the 8 statements.
 *
 * On large screens the dimension's context (code, name, description, the
 * "Cómo responder" tip) lives in a ~300px sticky column on the left, and
 * the 8 statement cards take the rest. On tablet/mobile everything
 * collapses into a single column keeping the logical order.
 *
 * The dimension's accent color is resolved through `getDimensionVisual`
 * (shared/lib/dimensions). Never hardcode the mapping here — the table
 * lives in a single place so every component reuses it. Its `-ink` tone
 * colors the name and each statement's label, so the six dimensions are told
 * apart in the questionnaire as in the radar (usability test P02).
 */
interface Props {
  dimension: DimensionWithStatements;
}

/**
 * A note for the «Cómo responder» guide of a dimension whose statements lean
 * on one another (usability tests P01, P05). Provisional until INNLAB reviews
 * the statements (decision D9): it describes their order, not the framework.
 */
const DEPENDENT_STATEMENTS: Partial<Record<DimensionCode, string>> = {
  TRL: 'Las afirmaciones 3, 4 y 5 se apoyan en la anterior: cada una describe una prueba más exigente de la misma solución. Responde cada una por lo que ya ocurrió.',
};

export function DimensionPanel({ dimension }: Props) {
  const visual = getDimensionVisual(dimension.code);
  const dependent = DEPENDENT_STATEMENTS[dimension.code];

  return (
    <section
      aria-labelledby={`dim-${dimension.code}-heading`}
      className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start xl:gap-10"
    >
      {/* Sticky under the progress band; a guide longer than the screen scrolls inside it,
          so it is read whole without reaching the last statement. */}
      <aside className="lg:sticky lg:top-48">
        <div
          className={`bg-surface-muted border-t-[3px] ${visual.border} rounded-2xl p-5 sm:p-6 lg:max-h-[calc(100vh-13.5rem)] lg:overflow-y-auto lg:overscroll-contain`}
        >
          <span
            aria-hidden="true"
            className={`border-border bg-background ${visual.textInk} mb-4 flex size-12 items-center justify-center border`}
          >
            <visual.icon className="size-6" />
          </span>
          <p className={`text-overline ${visual.textInk}`}>
            Dimensión {dimension.sequence} de 6 · {dimension.code}
          </p>
          <h2
            id={`dim-${dimension.code}-heading`}
            className={`${visual.textInk} mt-2 text-2xl font-bold leading-tight tracking-tight`}
          >
            {dimension.name}
          </h2>

          <p className="text-muted-foreground mt-3 text-[0.9375rem] leading-relaxed">
            {dimension.description}
          </p>

          <div className="border-border mt-5 border-t pt-4">
            <p className="text-foreground text-sm font-bold">Cómo responder</p>
            <ul className="text-muted-foreground mt-2 space-y-1.5 text-sm leading-relaxed">
              <li>
                Cada afirmación describe una práctica concreta de tu iniciativa{' '}
                <span className="text-foreground font-semibold">hoy</span>.
              </li>
              <li>
                Indica qué tan de acuerdo estás con que esta afirmación describe la realidad actual
                de tu iniciativa.
              </li>
              <li>
                Las últimas afirmaciones de cada dimensión describen iniciativas muy avanzadas. Por
                eso es normal responder «En desacuerdo» en ellas.
              </li>
              {dependent !== undefined && <li>{dependent}</li>}
            </ul>
          </div>
        </div>
      </aside>

      {/* List of statements */}
      <ol className="space-y-4 sm:space-y-5">
        {dimension.statements.map((statement) => (
          <li key={statement.id}>
            <StatementCard statement={statement} code={dimension.code} />
          </li>
        ))}
      </ol>
    </section>
  );
}
