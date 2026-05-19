import type { DimensionWithStatements } from '@innlab/contracts';
import { StatementCard } from './StatementCard';

/**
 * Panel de una dimensión IRL — encabezado + lista de 8 afirmaciones.
 *
 * El acento de color (`dimensionAccent`) viene de la paleta
 * `dimension-*` definida en `DESIGN.md`. Aparece como una barra
 * vertical de 4px al inicio del encabezado y bajo el badge de la
 * dimensión: indica de un vistazo qué eje del marco IRL está
 * activo, sin teñir el input de respuesta.
 */

interface Props {
  dimension: DimensionWithStatements;
}

const DIMENSION_ACCENT: Record<string, string> = {
  TRL: 'bg-dimension-trl',
  CRL: 'bg-dimension-crl',
  BRL: 'bg-dimension-brl',
  IPRL: 'bg-dimension-iprl',
  TmRL: 'bg-dimension-tmrl',
  FRL: 'bg-dimension-frl',
};

const DIMENSION_ACCENT_TEXT: Record<string, string> = {
  TRL: 'text-dimension-trl',
  CRL: 'text-dimension-crl',
  BRL: 'text-dimension-brl',
  IPRL: 'text-dimension-iprl',
  TmRL: 'text-dimension-tmrl',
  FRL: 'text-dimension-frl',
};

export function DimensionPanel({ dimension }: Props) {
  const accentBg = DIMENSION_ACCENT[dimension.code] ?? 'bg-primary';
  const accentText = DIMENSION_ACCENT_TEXT[dimension.code] ?? 'text-primary';

  return (
    <section aria-labelledby={`dim-${dimension.code}-heading`}>
      <header className="mb-6 flex items-start gap-4">
        <span aria-hidden="true" className={`mt-1 h-12 w-1 shrink-0 rounded-full ${accentBg}`} />
        <div className="flex-1">
          <p className={`text-overline ${accentText}`}>
            Dimensión {dimension.sequence} de 6 · {dimension.code}
          </p>
          <h2
            id={`dim-${dimension.code}-heading`}
            className="text-foreground mt-1 text-[1.75rem] font-bold leading-tight tracking-tight"
          >
            {dimension.name}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
            {dimension.description}
          </p>
        </div>
      </header>

      <ol className="space-y-4">
        {dimension.statements.map((statement) => (
          <li key={statement.id}>
            <StatementCard statement={statement} />
          </li>
        ))}
      </ol>
    </section>
  );
}
