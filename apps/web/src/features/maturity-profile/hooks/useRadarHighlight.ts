import { useState } from 'react';
import type { DimensionCode } from '@innlab/contracts';

/**
 * Estado compartido entre el radar y las tarjetas que señalan dimensiones: qué
 * dimensiones se resaltan.
 *
 * Es estado local del componente que los renderiza (la página de resultados),
 * no un store global: nada fuera de esa página lo necesita. Lo que está bajo el
 * cursor, o enfocado, se resalta (una punta del radar, una tarjeta, un par o
 * una alerta); al salir se suelta.
 */
export interface RadarHighlight {
  readonly highlighted: readonly DimensionCode[];
  readonly setHovered: (codes: readonly DimensionCode[]) => void;
}

export function useRadarHighlight(): RadarHighlight {
  const [highlighted, setHovered] = useState<readonly DimensionCode[]>([]);
  return { highlighted, setHovered };
}
