/**
 * Skeleton del cuestionario IRL.
 *
 * Reproduce la silueta real: tabs (lista de 6 columnas) + el
 * encabezado de dimensión + 8 tarjetas de afirmación. Usa el wash
 * Azul Icesi (`surface-muted`) para los placeholders en vez de un
 * gris muerto — mantiene el sistema visualmente cohesivo durante
 * la carga.
 */
export function QuestionnaireSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando cuestionario" className="space-y-6">
      {/* Tab list silhouette */}
      <div className="border-border bg-surface-muted grid h-12 grid-cols-6 gap-1 rounded-md border p-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`tab-${i}`} className="bg-border/60 h-full animate-pulse rounded-sm" />
        ))}
      </div>

      {/* Dimension header silhouette */}
      <div className="flex items-start gap-4">
        <div className="bg-border mt-1 h-12 w-1 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="bg-border/70 h-3 w-32 animate-pulse rounded" />
          <div className="bg-border/70 h-7 w-2/3 animate-pulse rounded" />
          <div className="bg-border/60 h-3 w-3/4 animate-pulse rounded" />
        </div>
      </div>

      {/* Statement cards silhouette */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`card-${i}`}
            data-testid="statement-placeholder"
            className="border-border bg-card rounded-md border p-5"
          >
            <div className="flex items-center justify-between">
              <div className="bg-border/70 h-3 w-28 animate-pulse rounded" />
              <div className="bg-border/70 h-3 w-10 animate-pulse rounded" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="bg-border/60 h-4 w-full animate-pulse rounded" />
              <div className="bg-border/60 h-4 w-11/12 animate-pulse rounded" />
              <div className="bg-border/60 h-4 w-3/4 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
