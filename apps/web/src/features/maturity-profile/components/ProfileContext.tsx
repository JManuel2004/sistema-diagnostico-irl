import type { JSX } from 'react';
import type { DimensionResult } from '@innlab/contracts';
import { Card, CardContent } from '@/shared/ui/card';

/**
 * Contexto para quien nunca ha oído hablar de IRL: qué es un nivel, qué es
 * una dimensión y cómo se lee el radar. Va siempre visible en la página de
 * resultados, antes del radar.
 *
 * Los nombres de las seis dimensiones salen de la respuesta, no de una lista
 * del frontend.
 */
interface Props {
  readonly dimensionResults: readonly DimensionResult[];
}

export function ProfileContext({ dimensionResults }: Props): JSX.Element {
  const names = dimensionResults.map((r) => r.shortName);
  return (
    <Card className="bg-surface-emphasis">
      <CardContent className="p-5 md:p-6">
        <h2 className="text-foreground text-base font-semibold">Cómo leer estos resultados</h2>
        <div className="text-muted-foreground mt-2 grid gap-3 text-sm leading-relaxed md:grid-cols-3">
          <p>
            <span className="text-foreground font-medium">Qué es el IRL.</span> El marco IRL
            (Innovation Readiness Level) mide qué tan preparada está una iniciativa para seguir
            avanzando: cuánto ha logrado y cuánto le falta.
          </p>
          <p>
            <span className="text-foreground font-medium">Qué es una dimensión.</span> Es un área
            que se evalúa por separado. Son seis: {names.join(', ')}.
          </p>
          <p>
            <span className="text-foreground font-medium">Qué es un nivel.</span> Cada dimensión
            recibe un nivel de 1 (muy inicial) a 9 (muy avanzado). El radar dibuja los seis: entre
            más lejos del centro está un punto, más avanzada es esa dimensión.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
