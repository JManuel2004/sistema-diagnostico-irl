import type { JSX } from 'react';
import { paths } from '@/shared/lib/paths';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  Compass,
  Gem,
  Info,
  Route,
  Scale,
  Siren,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from './badge';
import { Button, buttonVariants } from './button';
import { Card, CardContent } from './card';
import { FALLBACK_SUBJECT } from '@/shared/lib/copy';

/**
 * Invitation to accept the deep analysis (RF-11).
 *
 * The deep analysis is presented as what it is for the user: a valuable
 * next step — which in the future could be a separate service — not a
 * confirmation checkbox. That is why the invitation is a proposal with two
 * paths: asking for it, with what it includes in view, or continuing later.
 *
 * The recommendation and the roadmap are calculated and saved on
 * acceptance, so accepting is a user action and never an effect of opening
 * the screen. «Por ahora no» sends nothing: the profile is already saved
 * and the user can come back from their panel whenever they want.
 *
 * It is a paid feature: a «Premium · De pago» badge and the same mark on the
 * button say so before the user asks for it.
 */
interface AcceptDeepAnalysisCardProps {
  readonly onAccept: () => void;
  /** The acceptance or the calculation failed: the button turns into «Intentar de nuevo». */
  readonly failed: boolean;
  /** Name of the initiative, to address it. */
  readonly subject?: string;
}

const INCLUDES: readonly { text: string; icon: LucideIcon }[] = [
  {
    text: 'Los desequilibrios entre seis pares de dimensiones que deberían avanzar juntas.',
    icon: Scale,
  },
  { text: 'Alertas de las dimensiones clave que hoy más frenan tu avance.', icon: Siren },
  { text: 'Un plan de escalamiento por fases, en el orden en que conviene avanzar.', icon: Route },
  {
    text: 'La recomendación del servicio de INNLAB que mejor encaja con tu iniciativa.',
    icon: Compass,
  },
];

export function AcceptDeepAnalysisCard({
  onAccept,
  failed,
  subject = FALLBACK_SUBJECT,
}: AcceptDeepAnalysisCardProps): JSX.Element {
  return (
    <section aria-labelledby="deep-analysis-offer" className="flex flex-col gap-5">
      <header>
        <p className="text-eyebrow">Siguiente paso · Continúa cuando quieras</p>
        <h2
          id="deep-analysis-offer"
          className="text-h2 text-foreground mt-2 max-sm:text-[1.625rem]"
        >
          ¿Quieres profundizar el diagnóstico de {subject}?
        </h2>
        <p className="text-muted-foreground mt-3 max-w-prose text-lg leading-relaxed">
          Tu perfil de madurez ya está guardado. El análisis profundo lo lleva más lejos: cruza las
          seis dimensiones y te conecta con una ruta de acompañamiento concreta.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="border-border border-t-primary border-t-[3px]">
          <CardContent className="flex flex-col gap-6 p-6 md:p-10">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="info">
                  <Sparkles className="size-4" aria-hidden="true" />
                  Análisis profundo · Recomendado
                </Badge>
                <Badge tone="neutral">
                  <Gem className="size-4" aria-hidden="true" />
                  Premium · De pago
                </Badge>
              </div>
              <h3 className="text-foreground mt-4 text-2xl font-bold leading-tight">
                Conecta {subject} con una ruta de acompañamiento
              </h3>
            </div>

            <ul className="flex flex-col gap-3">
              {INCLUDES.map((item) => (
                <li
                  key={item.text}
                  className="text-foreground flex items-center gap-3 text-base leading-normal"
                >
                  <span
                    aria-hidden="true"
                    className="bg-azul-icesi text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full"
                  >
                    <item.icon className="size-4" />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>

            <div>
              <Button size="lg" className="w-full sm:w-auto" onClick={onAccept}>
                {!failed && <Gem className="size-5" aria-hidden="true" />}
                {failed ? 'Intentar de nuevo' : 'Solicitar análisis profundo'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="flex h-full flex-col gap-4 p-6 md:p-8">
            <span className="bg-surface-muted text-muted-foreground flex size-11 items-center justify-center rounded-xl">
              <CalendarClock className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-muted-foreground text-sm font-bold">Por ahora no</p>
              <h3 className="text-foreground mt-1 text-xl font-bold">
                Guardar y continuar después
              </h3>
            </div>
            <p className="text-muted-foreground text-base leading-relaxed">
              El perfil de madurez de {subject} queda guardado en tu cuenta. Puedes volver cuando
              quieras a pedir el análisis profundo.
            </p>
            <Link
              to={paths.panel}
              className={`${buttonVariants({ variant: 'secondary', size: 'lg' })} mt-auto`}
            >
              Ir a mi panel
            </Link>
          </CardContent>
        </Card>
      </div>

      <p className="bg-surface-muted text-muted-foreground flex items-start gap-2 rounded-xl p-4 text-base">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        El análisis profundo es voluntario: puedes pedirlo cuando quieras, sin límite de tiempo.
      </p>
    </section>
  );
}

/**
 * When the analysis was already accepted but one of its results was not
 * calculated: the same action, phrased as a retry.
 */
export function RetryDeepAnalysisCard({ onRetry }: { readonly onRetry: () => void }): JSX.Element {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-foreground text-lg font-semibold">
          Vuelve a pedir el análisis profundo para ver este resultado
        </h2>
        <p className="text-muted-foreground mt-2 max-w-prose text-base leading-relaxed">
          El cálculo no terminó la vez anterior. Al intentarlo de nuevo se recalcula la
          recomendación de portafolio y el plan de escalamiento.
        </p>
        <Button className="mt-4" onClick={onRetry}>
          Intentar de nuevo
        </Button>
      </CardContent>
    </Card>
  );
}
