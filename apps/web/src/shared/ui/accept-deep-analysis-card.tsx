import type { JSX } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';

/**
 * Invitación a aceptar el análisis profundo (RF-11).
 *
 * La recomendación y el roadmap se calculan y guardan al aceptarlo, así que
 * las dos pantallas muestran lo mismo cuando aún no existen: qué hace la
 * acción y el botón que la ejecuta. Aceptar es una acción del usuario y
 * nunca un efecto de abrir la pantalla (backlog 4.6 / 10.7).
 */
interface AcceptDeepAnalysisCardProps {
  readonly onAccept: () => void;
  /** La aceptación o el cálculo fallaron: el botón pasa a «Intentar de nuevo». */
  readonly failed: boolean;
  readonly description?: string;
}

export function AcceptDeepAnalysisCard({
  onAccept,
  failed,
  description = 'El análisis profundo calcula la recomendación de portafolio y el roadmap de escalamiento a partir de tu perfil de madurez.',
}: AcceptDeepAnalysisCardProps): JSX.Element {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-foreground text-lg font-semibold">
          Acepta el análisis profundo para ver este resultado
        </h2>
        <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
          {description}
        </p>
        <Button className="mt-4" onClick={onAccept}>
          {failed ? 'Intentar de nuevo' : 'Aceptar análisis profundo'}
        </Button>
      </CardContent>
    </Card>
  );
}
