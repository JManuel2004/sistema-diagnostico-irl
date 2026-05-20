/**
 * Skeleton del cuestionario IRL.
 *
 * Reproduce la silueta real: progress strip + tabs (lista de 6
 * columnas) + layout de dos columnas (sidebar de dimensión sticky +
 * lista de 8 afirmaciones). En móvil colapsa a una sola columna,
 * igual que el layout real. Usa el wash Azul Icesi (`surface-muted`)
 * para los placeholders en vez de un gris muerto.
 */
export function QuestionnaireSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando cuestionario" className="space-y-6">
      {/* Progress strip silhouette */}
      <div className="border-border bg-surface-muted rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div className="bg-border/70 h-3 w-40 animate-pulse rounded" />
          <div className="bg-border/70 h-3 w-32 animate-pulse rounded" />
        </div>
        <div className="bg-border/60 mt-3 h-1.5 w-full animate-pulse rounded-full" />
      </div>

      {/* Tab list silhouette */}
      <div className="border-border bg-surface-muted grid h-12 grid-cols-6 gap-1 rounded-md border p-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`tab-${i}`} className="bg-border/60 h-full animate-pulse rounded-sm" />
        ))}
      </div>

      {/* Two-column body: sidebar + statement list */}
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        {/* Sidebar silhouette */}
        <div className="border-border bg-surface-muted/40 space-y-4 rounded-md border p-5">
          <div className="flex items-start gap-3">
            <div className="bg-border mt-1 h-10 w-1 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="bg-border/70 h-3 w-28 animate-pulse rounded" />
              <div className="bg-border/70 h-5 w-3/4 animate-pulse rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="bg-border/60 h-3 w-full animate-pulse rounded" />
            <div className="bg-border/60 h-3 w-5/6 animate-pulse rounded" />
            <div className="bg-border/60 h-3 w-2/3 animate-pulse rounded" />
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
    </div>
  );
}
