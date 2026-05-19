export function QuestionnaireSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando cuestionario" className="space-y-4">
      <div className="bg-muted h-10 animate-pulse rounded" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-muted h-24 animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
