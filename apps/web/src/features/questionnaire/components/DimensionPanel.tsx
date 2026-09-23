import type { DimensionWithStatements } from '@innlab/contracts';
import { StatementCard } from './StatementCard';
import { getDimensionVisual } from '@/shared/lib/dimensions';

/**
 * Panel of an IRL dimension — sticky sidebar with context + the list of
 * the 8 statements.
 *
 * On large screens the dimension's context (code, name, description, the
 * "Cómo responder" tip) lives in a ~280px sticky column on the left, and
 * the 8 statement cards take the rest. On tablet/mobile everything
 * collapses into a single column keeping the logical order.
 *
 * The dimension's accent color is resolved through `getDimensionVisual`
 * (shared/lib/dimensions). Never hardcode the mapping here — the table
 * lives in a single place so every component reuses it.
 */
interface Props {
  dimension: DimensionWithStatements;
}

export function DimensionPanel({ dimension }: Props) {
  const visual = getDimensionVisual(dimension.code);

  return (
    <section
      aria-labelledby={`dim-${dimension.code}-heading`}
      className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start"
    >
      {/* Sidebar — context of the dimension */}
      <aside className="lg:sticky lg:top-24">
        <div className="bg-surface-muted rounded-2xl p-5 sm:p-6">
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
            className="text-foreground mt-2 text-2xl font-bold leading-tight tracking-tight"
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
              <li>Indica qué tan de acuerdo estás con que describe la realidad actual.</li>
              <li>Es normal que los niveles más altos sean &quot;En desacuerdo&quot;.</li>
            </ul>
          </div>
        </div>
      </aside>

      {/* List of statements */}
      <ol className="space-y-4 sm:space-y-5">
        {dimension.statements.map((statement) => (
          <li key={statement.id}>
            <StatementCard statement={statement} />
          </li>
        ))}
      </ol>
    </section>
  );
}
