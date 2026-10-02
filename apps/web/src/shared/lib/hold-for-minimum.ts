/**
 * How long a calculated result stays on the processing screen.
 * The calculation itself is often faster than a person can see.
 */
export const PROCESSING_VISIBLE_MS = 2000;

/** Resolves immediately when the work already lasted `minimumMs`. */
export function holdForMinimum(
  startedAt: number,
  minimumMs = PROCESSING_VISIBLE_MS,
): Promise<void> {
  const remaining = minimumMs - (Date.now() - startedAt);
  if (remaining <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, remaining);
  });
}
