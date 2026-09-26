import { useState } from 'react';
import type { DimensionCode } from '@innlab/contracts';

/**
 * State shared by the radar and the cards that point at dimensions: which
 * dimensions are highlighted.
 *
 * It is local state of the component that renders them (the results page),
 * not a global store: nothing outside that page needs it. Whatever is under
 * the cursor, or focused, is highlighted (a radar point, a card, a pair or
 * an alert); leaving it releases it.
 */
export interface RadarHighlight {
  readonly highlighted: readonly DimensionCode[];
  readonly setHovered: (codes: readonly DimensionCode[]) => void;
}

export function useRadarHighlight(): RadarHighlight {
  const [highlighted, setHovered] = useState<readonly DimensionCode[]>([]);
  return { highlighted, setHovered };
}
