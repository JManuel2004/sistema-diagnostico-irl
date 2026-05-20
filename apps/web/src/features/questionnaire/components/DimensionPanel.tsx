import type { DimensionWithStatements } from '@innlab/contracts';
import { StatementCard } from './StatementCard';

/**
 * Panel de una dimensión IRL — sidebar sticky con contexto +
 * lista de las 8 afirmaciones.
 *
 * Adoptado del prototipo cliente para romper la linealidad de la
 * primera versión (DESIGN.md `reading` width): en pantallas grandes el
 * contexto de la dimensión (código, nombre, descripción, tip "Cómo
 * responder") vive en una columna sticky de ~280px a la izquierda,
 * y las 8 tarjetas de afirmación ocupan el resto. En tablet/móvil
 * todo colapsa a una sola columna conservando el orden lógico.
 *
 * La barra de acento (`bg-dimension-*`) sigue presente en el sidebar
 * para mantener la identificación cromática del eje IRL activo, sin
 * teñir el input de respuesta.
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
    <section
      aria-labelledby={`dim-${dimension.code}-heading`}
      className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start"
    >
      {/* Sidebar — contexto de la dimensión */}
      <aside className="lg:sticky lg:top-24">
        <div className="border-border bg-surface-muted/40 rounded-md border p-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-1 h-10 w-1 shrink-0 rounded-full ${accentBg}`}
            />
            <div className="flex-1">
              <p className={`text-overline ${accentText}`}>
                Dimensión {dimension.sequence} de 6 · {dimension.code}
              </p>
              <h2
                id={`dim-${dimension.code}-heading`}
                className="text-foreground mt-1.5 text-xl font-bold leading-tight tracking-tight"
              >
                {dimension.name}
              </h2>
            </div>
          </div>

          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            {dimension.description}
          </p>

          <div className="border-border/70 mt-5 border-t pt-4">
            <p className="text-overline text-muted-foreground">Cómo responder</p>
            <ul className="text-muted-foreground mt-2 space-y-1.5 text-xs leading-relaxed">
              <li>
                Cada afirmación describe una práctica concreta de tu iniciativa{' '}
                <span className="text-foreground/80">hoy</span>.
              </li>
              <li>Indica qué tan de acuerdo estás con que describe la realidad actual.</li>
              <li>Es normal que los niveles más altos sean &quot;En desacuerdo&quot;.</li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Lista de afirmaciones */}
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
