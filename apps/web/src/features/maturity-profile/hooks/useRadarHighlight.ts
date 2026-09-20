import { useCallback, useState } from 'react';
import type { DimensionCode } from '@innlab/contracts';
import { effectiveHighlight } from '../utils/radar-helpers';

/**
 * Estado compartido entre el radar, su leyenda y las tarjetas que señalan
 * dimensiones: qué dimensiones se resaltan.
 *
 * Es estado local del componente que los renderiza (la página de resultados),
 * no un store global: nada fuera de esa página lo necesita.
 *
 *  - `hovered`: lo que está bajo el cursor o enfocado (tarjeta, leyenda).
 *  - `pinned`: la dimensión que el usuario fijó con un clic en la leyenda;
 *    un segundo clic sobre la misma la suelta.
 *  - `highlighted`: lo que el radar enfatiza; lo que está bajo el cursor gana
 *    sobre lo fijado.
 */
export interface RadarHighlight {
  readonly highlighted: readonly DimensionCode[];
  readonly pinned: DimensionCode | null;
  readonly setHovered: (codes: readonly DimensionCode[]) => void;
  readonly togglePinned: (code: DimensionCode) => void;
}

export function useRadarHighlight(): RadarHighlight {
  const [hovered, setHovered] = useState<readonly DimensionCode[]>([]);
  const [pinned, setPinned] = useState<DimensionCode | null>(null);

  const togglePinned = useCallback((code: DimensionCode) => {
    setPinned((current) => (current === code ? null : code));
  }, []);

  return {
    highlighted: effectiveHighlight(hovered, pinned),
    pinned,
    setHovered,
    togglePinned,
  };
}
