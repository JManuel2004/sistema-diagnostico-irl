import type { JSX } from 'react';
import { paths } from '@/shared/lib/paths';
import type { DimensionCode } from '@innlab/contracts';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserMenu } from '@features/auth';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';
import { PageShell } from '@/shared/ui/page-shell';
import { DIMENSION_ORDER, getDimensionVisual } from '@/shared/lib/dimensions';
import { hasStoredSession } from '@/shared/auth/session';

/**
 * Institutional landing.
 *
 * It is public and carries no navigation: it is seen without a session, and
 * its only button, «Iniciar diagnóstico», leads to the panel (`/panel`).
 * That route is protected: without a session it goes through the INNLAB
 * sign-in and continues on return, without the user pressing again. The
 * panel is where the user chooses between a completed diagnostic and a new
 * one (DIAGIRL-26); with none completed, starting is its only action.
 *
 * Composition:
 *  - A left-aligned hero (the manual's alignment rule), with the headline
 *    in color blocks and the key phrase highlighted in yellow, like
 *    innlab.org: the institutional context, the h1, the paragraph (the
 *    need, what is offered and why), the CTA and the questionnaire facts
 *    (48 statements, 6 dimensions, levels 1 to 9). The time it takes is not
 *    shown: the answers are saved, so it can be done in several sessions,
 *    and that goes in the small print under the facts. Next to it, what is
 *    received at the end, with a schematic radar without values, in two
 *    groups: what the diagnostic gives on finishing the questionnaire, and
 *    what the deep analysis adds, marked «De pago» as on the results screen
 *    (usability test P05 read the deep analysis as part of the basic
 *    result).
 *  - A mosaic of the 6 dimensions, right after the hero: it is the
 *    vocabulary the rest of the product uses, so it comes before the
 *    process. A header in each one's color with its code and what the code
 *    means («TRL - Madurez tecnológica»), and a white body with what it
 *    measures in plain words.
 *    It is the only saturated color moment of the screen. Colors
 *    and canonical order are resolved with `getDimensionVisual` /
 *    `DIMENSION_ORDER` (shared/lib/dimensions). The only thing living in
 *    this page is the editorial copy (name + short description); the full
 *    official name comes from the catalog in the pages that consume it.
 *  - «Cómo funciona»: the three steps as a numbered list on a soft
 *    surface, not as cards.
 */

interface LandingDimensionCopy {
  readonly code: DimensionCode;
  readonly name: string;
  readonly shortDescription: string;
}

/**
 * Editorial copy specific to the landing. It is marketing copy, not
 * framework metadata — which is why it lives here and not in `shared/lib`.
 * The full official names (`Madurez Tecnológica`, etc.) are served by the
 * API on the pages that consume the catalog.
 */
const LANDING_COPY: Record<DimensionCode, Omit<LandingDimensionCopy, 'code'>> = {
  TRL: {
    name: 'Madurez tecnológica',
    shortDescription:
      'Qué tan probada y lista está tu solución para usarse en un entorno productivo real.',
  },
  CRL: {
    name: 'Madurez de cliente',
    shortDescription:
      'Qué tanto conoces a tus clientes: si su necesidad está confirmada y si están dispuestos a usar o comprar tu solución.',
  },
  BRL: {
    name: 'Madurez de negocio',
    shortDescription:
      'Qué tan claro está cómo tu iniciativa crea valor, genera ingresos y se sostiene en el tiempo.',
  },
  IPRL: {
    name: 'Propiedad intelectual',
    shortDescription:
      'Qué tan protegidas están tus ideas, tu tecnología y tu marca, y si puedes usarlas sin chocar con derechos de otros.',
  },
  TmRL: {
    name: 'Madurez de equipo',
    shortDescription: 'Qué tan completo y comprometido está el equipo que impulsa la iniciativa.',
  },
  FRL: {
    name: 'Madurez de financiación',
    shortDescription:
      'Con qué recursos cuentas para avanzar y qué tan claro es tu plan para conseguir los que te faltan.',
  },
};

export default function LandingPage(): JSX.Element {
  return (
    <PageShell
      width="wide"
      showAttribution
      headerActions={hasStoredSession() ? <UserMenu /> : undefined}
      contentClassName="py-0 sm:py-0"
    >
      {/* Hero — institutional layout, left-aligned per brand manual */}
      <section
        aria-labelledby="hero-title"
        className="grid gap-12 py-10 sm:py-16 lg:grid-cols-12 lg:items-center lg:gap-16 lg:py-24"
      >
        <div className="flex flex-col gap-6 lg:col-span-7 lg:gap-7">
          <p className="bg-dimension-frl text-foreground flex items-center self-start px-3 py-1.5 text-sm font-semibold">
            Centro de Innovación · Universidad Icesi
          </p>
          {/* Headline in color blocks, like innlab.org's «INNOVACIÓN / Para el mañana». */}
          <h1 id="hero-title" className="flex flex-col items-start gap-1.5 leading-none">
            <span className="bg-azul-icesi text-primary-foreground px-3.5 py-2 text-[2.375rem] font-extrabold uppercase tracking-[-0.02em] sm:px-5 sm:py-2.5 sm:text-5xl lg:text-[4rem]">
              Diagnóstico IRL
            </span>{' '}
            <span className="bg-accent text-accent-foreground px-3 py-2 text-2xl font-bold tracking-[-0.01em] sm:px-4 sm:text-[2.125rem]">
              para iniciativas de innovación.
            </span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-[1.0625rem] leading-relaxed sm:text-xl">
            ¿Quieres sacar adelante tu idea de innovación? Te ofrecemos un diagnóstico de su
            madurez: respondes un formulario y descubres{' '}
            <mark className="bg-dimension-frl text-foreground px-1 font-bold">
              las brechas que necesitas superar
            </mark>{' '}
            para hacerla realidad.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <Link
              to={paths.panel}
              className={`${buttonVariants({ size: 'lg' })} w-full self-start sm:w-auto`}
            >
              Iniciar diagnóstico
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            {/* What the user needs before pressing: the sign-in is INNLAB's, not this system's. */}
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
              {hasStoredSession()
                ? 'Ya iniciaste sesión: entrarás directo a tu panel.'
                : 'Ingresas con tu cuenta del ecosistema INNLAB. Te llevaremos a su página de inicio de sesión y, al volver, llegarás a tu panel para empezar.'}
            </p>
          </div>

          <dl className="border-border mt-2 grid grid-cols-3 gap-4 border-t pt-6 sm:flex sm:gap-10">
            {[
              { value: '48', label: 'afirmaciones', ink: 'text-foreground' },
              { value: '6', label: 'dimensiones', ink: 'text-foreground' },
              { value: '1 a 9', label: 'niveles de madurez', ink: 'text-foreground' },
            ].map((fact) => (
              <div key={fact.label} className="flex flex-col-reverse gap-1">
                <dt className="text-muted-foreground text-sm">{fact.label}</dt>
                <dd
                  className={`${fact.ink} text-2xl font-extrabold tracking-tight sm:text-[1.625rem]`}
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground -mt-2 max-w-xl text-sm leading-relaxed">
            Tus respuestas se guardan automáticamente: puedes responder en una o en varias sesiones.
            Tus resultados aparecen apenas terminas.
          </p>
        </div>

        <aside
          aria-labelledby="receives-title"
          className="bg-surface-muted flex flex-col gap-6 rounded-3xl p-6 sm:p-9 lg:col-span-5"
        >
          <p id="receives-title" className="text-eyebrow">
            Lo que recibes al terminar
          </p>
          <SchematicRadar />
          <div className="flex flex-col gap-3">
            <p className="text-foreground text-base font-bold">Al terminar el cuestionario</p>
            <ul className="flex flex-col gap-3.5">
              {BASIC_RESULT.map((text) => (
                <li key={text} className="text-foreground flex gap-3 text-base leading-normal">
                  <Check
                    className="text-azul-icesi mt-0.5 size-5 shrink-0"
                    strokeWidth={2.6}
                    aria-hidden="true"
                  />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-border flex flex-col gap-3 border-t pt-5">
            <p className="text-foreground flex flex-wrap items-center gap-2 text-base font-bold">
              Con el análisis profundo
              <Badge>De pago</Badge>
            </p>
            <ul className="flex flex-col gap-3.5">
              {DEEP_ANALYSIS_RESULT.map((text) => (
                <li key={text} className="text-foreground flex gap-3 text-base leading-normal">
                  <Plus
                    className="text-azul-icesi mt-0.5 size-5 shrink-0"
                    strokeWidth={2.6}
                    aria-hidden="true"
                  />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      {/* Dimensions overview grid */}
      <section
        aria-labelledby="dimensiones-heading"
        className="flex flex-col gap-8 py-14 sm:gap-10 sm:py-20 lg:py-24"
      >
        <div className="flex flex-col gap-3">
          <p className="text-eyebrow">Qué evaluamos</p>
          <h2
            id="dimensiones-heading"
            className="text-foreground text-[1.875rem] font-bold leading-tight tracking-tight sm:text-[2.5rem]"
          >
            Las seis dimensiones de tu iniciativa
          </h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {DIMENSION_ORDER.map((code) => {
            const visual = getDimensionVisual(code);
            const copy = LANDING_COPY[code];
            return (
              <li key={code} className="border-border flex flex-col border">
                {/* The only color moment of the screen, like innlab.org's mosaic. */}
                <div className={`${visual.bg} px-5 py-4 sm:px-8 sm:py-5`}>
                  {/* The color goes on the h3: the base layer of globals.css sets the one of h1–h4. */}
                  <h3 className={`${TILE_TEXT[code]} text-xl font-bold`}>
                    {code} - {copy.name}
                  </h3>
                </div>
                <div className="flex flex-col gap-2 p-5 sm:p-8 sm:pt-5">
                  <p className="text-muted-foreground text-base leading-relaxed">
                    {copy.shortDescription}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      {/* How it works — three-step institutional process */}
      <section
        aria-labelledby="proceso-heading"
        className="bg-surface-muted -mx-4 grid gap-10 px-4 py-14 sm:-mx-8 sm:px-8 sm:py-20 lg:mx-0 lg:mb-24 lg:grid-cols-12 lg:gap-16 lg:rounded-3xl lg:px-14 lg:py-20"
      >
        <div className="flex flex-col gap-3 lg:col-span-4">
          <p className="text-eyebrow">Proceso</p>
          <h2
            id="proceso-heading"
            className="text-foreground text-[1.875rem] font-bold leading-tight tracking-tight sm:text-[2.5rem]"
          >
            Cómo funciona
          </h2>
          <p className="text-muted-foreground text-[1.0625rem] leading-relaxed">
            Tres pasos, en una sola sesión o en varias.
          </p>
        </div>
        <ol className="grid gap-8 sm:grid-cols-3 sm:gap-10 lg:col-span-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3.5">
              <div className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className={`${step.circle} flex size-11 shrink-0 items-center justify-center rounded-full text-xl font-extrabold`}
                >
                  {index + 1}
                </span>
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`${step.line} hidden h-0.5 flex-1 sm:block`}
                  />
                )}
              </div>
              <h3 className="text-h3 text-foreground font-bold">{step.title}</h3>
              <p className="text-muted-foreground text-base leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}

/** What the diagnostic gives as soon as the questionnaire is processed. */
const BASIC_RESULT: readonly string[] = [
  'Un perfil que ubica tu iniciativa en cada dimensión, del nivel 1 (una idea inicial) al 9 (una iniciativa madura y sostenible en su mercado), y te explica qué significa cada nivel',
  'Tu dimensión más fuerte y la más débil, la que hoy más frena tu avance',
];

/** What the deep analysis adds, only if the user activates it. */
const DEEP_ANALYSIS_RESULT: readonly string[] = [
  'Los desequilibrios entre dimensiones que deberían avanzar juntas',
  'El servicio de INNLAB que mejor te acompaña y tu ruta de escalamiento',
];

/**
 * Text of each dimension's colored header: white over the dark tones, ink
 * over the green and the yellow. At 20px bold it is large text, so white
 * over TmRL's orange (3.7:1) meets WCAG AA.
 */
const TILE_TEXT: Record<DimensionCode, string> = {
  TRL: 'text-primary-foreground',
  CRL: 'text-primary-foreground',
  BRL: 'text-foreground',
  IPRL: 'text-primary-foreground',
  TmRL: 'text-primary-foreground',
  FRL: 'text-foreground',
};

const STEPS: readonly { title: string; body: string; circle: string; line: string }[] = [
  {
    title: 'Responde el formulario',
    body: '48 afirmaciones sobre las seis dimensiones. En cada una indicas qué tan de acuerdo estás, de 1 a 5. Si no terminas, continúas después donde lo dejaste.',
    circle: 'bg-dimension-trl text-primary-foreground',
    line: 'bg-border',
  },
  {
    title: 'Conoce tu perfil de madurez',
    body: 'Un gráfico te muestra en qué nivel, de 1 a 9, está tu iniciativa en cada dimensión y qué significa ese nivel.',
    circle: 'bg-dimension-trl text-primary-foreground',
    line: 'bg-border',
  },
  {
    title: 'Recibe tu ruta de escalamiento',
    body: 'Con el análisis profundo te presentamos una ruta por fases para hacer realidad tu innovación, con los servicios de INNLAB que pueden acompañarte.',
    circle: 'bg-dimension-trl text-primary-foreground',
    line: 'bg-border',
  },
];

/**
 * Profile radar without values: the six axes with their color and code. It
 * anticipates the shape of the result without showing data the user does
 * not have yet.
 */
const RADAR_AXES: readonly {
  code: DimensionCode;
  x: number;
  y: number;
  lx: number;
  ly: number;
  anchor: 'start' | 'middle' | 'end';
}[] = [
  { code: 'TRL', x: 200, y: 40, lx: 200, ly: 14, anchor: 'middle' },
  { code: 'CRL', x: 338.6, y: 120, lx: 352, ly: 108, anchor: 'start' },
  { code: 'BRL', x: 338.6, y: 280, lx: 352, ly: 300, anchor: 'start' },
  { code: 'IPRL', x: 200, y: 360, lx: 200, ly: 396, anchor: 'middle' },
  { code: 'TmRL', x: 61.4, y: 280, lx: 48, ly: 300, anchor: 'end' },
  { code: 'FRL', x: 61.4, y: 120, lx: 48, ly: 108, anchor: 'end' },
];

function ring(scale: number): string {
  return RADAR_AXES.map(
    (a) => `${String(200 + (a.x - 200) * scale)},${String(200 + (a.y - 200) * scale)}`,
  ).join(' ');
}

function SchematicRadar(): JSX.Element {
  return (
    <svg
      viewBox="-40 -24 480 448"
      className="h-auto w-full max-w-[22rem] self-center"
      aria-hidden="true"
    >
      <polygon points={ring(1)} fill="hsl(var(--background))" stroke="hsl(var(--border))" />
      {RADAR_AXES.map((axis, i) => {
        const next = RADAR_AXES[(i + 1) % RADAR_AXES.length];
        return (
          <polygon
            key={`slice-${axis.code}`}
            points={`200,200 ${String(axis.x)},${String(axis.y)} ${String(next.x)},${String(next.y)}`}
            fill={getDimensionVisual(axis.code).fill}
            fillOpacity={0.1}
          />
        );
      })}
      <polygon points={ring(2 / 3)} fill="none" stroke="hsl(var(--border))" />
      <polygon points={ring(1 / 3)} fill="none" stroke="hsl(var(--border))" />
      {RADAR_AXES.map((axis) => {
        const visual = getDimensionVisual(axis.code);
        return (
          <g key={axis.code}>
            <path
              d={`M200 200L${String(axis.x)} ${String(axis.y)}`}
              stroke={visual.fill}
              strokeWidth={2}
            />
            <circle cx={axis.x} cy={axis.y} r={8} fill={visual.fill} />
            <text
              x={axis.lx}
              y={axis.ly}
              textAnchor={axis.anchor}
              fontSize={18}
              fontWeight={700}
              fill={visual.color}
            >
              {axis.code}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
