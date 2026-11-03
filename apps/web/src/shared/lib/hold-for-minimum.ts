/**
 * How long a calculated result stays on the processing screen.
 * The calculation itself is often faster than a person can see, and the
 * client asked for the wait to show the work behind the result (validation
 * of RF-08: at least about ten seconds), for the profile and for the deep
 * analysis alike.
 */
export const PROCESSING_VISIBLE_MS = 10_000;

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
