import type { DimensionWithStatements } from '@innlab/contracts';
import { StatementCard } from './StatementCard';

interface Props {
  dimension: DimensionWithStatements;
}

export function DimensionPanel({ dimension }: Props) {
  return (
    <section aria-labelledby={`dim-${dimension.code}-heading`} className="mt-4">
      <header className="mb-4">
        <h2 id={`dim-${dimension.code}-heading`} className="text-xl font-semibold">
          {dimension.name}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{dimension.description}</p>
      </header>
      <ol className="space-y-3">
        {dimension.statements.map((statement) => (
          <li key={statement.id}>
            <StatementCard statement={statement} />
          </li>
        ))}
      </ol>
    </section>
  );
}
