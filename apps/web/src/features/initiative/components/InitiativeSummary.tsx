import type { JSX } from 'react';
import type { Initiative } from '@innlab/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

/**
 * La iniciativa tal como se registró: lo que el panel muestra del perfil.
 * Es una lista de definición (etiqueta y valor), sin controles.
 */
interface Props {
  readonly initiative: Initiative;
}

export function InitiativeSummary({ initiative }: Props): JSX.Element {
  const rows: readonly (readonly [string, string])[] = [
    ['Sector', initiative.sector.name],
    ['Tipo de producto o servicio', initiative.productType],
    ['Etapa', `${initiative.stage.name} — ${initiative.declaredStage}`],
    [
      'Equipo',
      `${String(initiative.teamSize)} ${initiative.teamSize === 1 ? 'persona' : 'personas'} — ${initiative.teamDescription}`,
    ],
    ['Mercado objetivo', initiative.targetMarket],
    ['Financiamiento actual', initiative.currentFunding],
  ];

  return (
    <Card>
      <CardHeader>
        <p className="text-overline text-azul-icesi">Tu iniciativa</p>
        <CardTitle>{initiative.name}</CardTitle>
        <CardDescription>Lo que registraste antes del cuestionario.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-overline text-muted-foreground">{label}</dt>
              <dd className="text-foreground mt-1 text-sm leading-relaxed">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
