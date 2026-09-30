/**
 * A service that takes no part in the exclusions or the score (layers 1
 * and 2). It only enters the ranking when an `INCLUDE` adjustment (layer 3)
 * puts it at the position the rule sets; from then on it is one more place
 * of the ranking.
 */
export interface AdjustmentOnlyService {
  readonly idService: number;
  readonly serviceName: string;
}
