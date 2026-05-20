import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import type { DimensionCode } from '@innlab/contracts';
import { buttonVariants } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { PageShell } from '@/shared/ui/page-shell';
import { DIMENSION_ORDER, getDimensionVisual } from '@/shared/lib/dimensions';

/**
 * Landing institucional.
 *
 * Composición:
 *  - Hero alineado a la izquierda (regla de alineación del manual),
 *    overline con el contexto institucional, h1 con el nombre del
 *    sistema, párrafo introductorio y CTA filled `accent`.
 *  - Tarjeta de "Cómo funciona" con los tres pasos del proceso
 *    SEMI / diagnóstico, separados por hairlines Gris 2.
 *  - Mosaico de las 6 dimensiones IRL — los colores y el orden
 *    canónico se resuelven a través de `getDimensionVisual` /
 *    `DIMENSION_ORDER` (shared/lib/dimensions). Lo único que vive
 *    en esta página es el copy editorial (nombre+descripción corta);
 *    el nombre oficial completo viene del catálogo en las páginas
 *    que sí lo consumen.
 */

interface LandingDimensionCopy {
  readonly code: DimensionCode;
  readonly name: string;
  readonly shortDescription: string;
}

/**
 * Copy editorial específico de la landing. Es marketing copy, no
 * metadata del marco — por eso vive aquí y no en `shared/lib`. Los
 * nombres oficiales completos (`Madurez Tecnológica`, etc.) se
 * sirven desde la API en las páginas que consumen el catálogo.
 */
const LANDING_COPY: Record<DimensionCode, Omit<LandingDimensionCopy, 'code'>> = {
  TRL: {
    name: 'Madurez Tecnológica',
    shortDescription: 'Qué tan probada y lista para producción está la solución.',
  },
  CRL: {
    name: 'Madurez de Cliente',
    shortDescription: 'Validación de necesidad, segmentación y disposición a adoptar.',
  },
  BRL: {
    name: 'Madurez de Negocio',
    shortDescription: 'Propuesta de valor, fuentes de ingresos y viabilidad económica.',
  },
  IPRL: {
    name: 'Propiedad Intelectual',
    shortDescription: 'Identificación, protección y libertad de operación de PI.',
  },
  TmRL: {
    name: 'Madurez de Equipo',
    shortDescription: 'Composición, competencias y dedicación de miembros clave.',
  },
  FRL: {
    name: 'Madurez de Financiación',
    shortDescription: 'Fuentes de capital, runway y plan financiero por hitos.',
  },
};

export default function HomePage(): JSX.Element {
  return (
    <PageShell width="wide" showAttribution>
      {/* Hero — institutional layout, left-aligned per brand manual */}
      <section className="grid gap-10 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <p className="text-overline text-azul-icesi">
            Centro de Innovación · KTH Innovation Readiness Level
          </p>
          <h1 className="tracking-tightest text-foreground mt-3 text-4xl font-bold leading-[1.1] sm:text-5xl">
            Diagnóstico IRL para iniciativas de innovación.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-relaxed">
            Evalúa la madurez de tu iniciativa en seis dimensiones del marco KTH Innovation
            Readiness Level y obtén un perfil con el roadmap para cerrar las brechas más críticas.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/diagnosticos/demo/cuestionario" className={buttonVariants({ size: 'lg' })}>
              Iniciar diagnóstico
            </Link>
            <a
              href="https://innlab.org/"
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants({ variant: 'ghost', size: 'lg' })}
            >
              Conocer INNLAB
            </a>
          </div>

          <p className="text-muted-foreground mt-6 text-sm">
            Tiempo estimado: 45–60 minutos · Resultados inmediatos al finalizar.
          </p>
        </div>

        {/* Visual companion — institutional metric panel */}
        <div className="lg:col-span-5">
          <Card className="overflow-hidden">
            <div className="border-border bg-azul-wash border-b px-6 py-4">
              <p className="text-overline text-azul-icesi">Perfil IRL</p>
              <p className="text-foreground mt-1 text-sm">
                Escala 1 → 9 por dimensión · 5 niveles Likert por afirmación.
              </p>
            </div>
            <CardContent className="space-y-3 p-6">
              {DIMENSION_ORDER.map((code) => {
                const visual = getDimensionVisual(code);
                const copy = LANDING_COPY[code];
                return (
                  <div key={code} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${visual.bg}`}
                    />
                    <span className="text-overline text-foreground w-12">{code}</span>
                    <span className="text-muted-foreground flex-1 text-sm">{copy.name}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it works — three-step institutional process */}
      <section className="mt-20" aria-labelledby="proceso-heading">
        <h2
          id="proceso-heading"
          className="text-foreground text-2xl font-bold leading-tight tracking-tight"
        >
          Cómo funciona
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Responde 48 afirmaciones',
              body: 'Ocho afirmaciones por dimensión, escala Likert de 1 a 5. Conserva tu progreso entre sesiones.',
            },
            {
              step: '02',
              title: 'Obtén tu perfil IRL',
              body: 'Visualiza tu madurez en cada dimensión sobre una escala 1–9 con análisis de desequilibrios.',
            },
            {
              step: '03',
              title: 'Recibe tu roadmap',
              body: 'Recomendaciones priorizadas para cerrar las brechas detectadas con el portafolio de InnLab.',
            },
          ].map((s) => (
            <Card key={s.step} className="p-6">
              <p className="text-overline text-azul-icesi">Paso {s.step}</p>
              <h3 className="text-foreground mt-2 text-lg font-semibold tracking-tight">
                {s.title}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Dimensions overview grid */}
      <section className="mt-16" aria-labelledby="dimensiones-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="dimensiones-heading"
            className="text-foreground text-2xl font-bold leading-tight tracking-tight"
          >
            Las seis dimensiones
          </h2>
          <p className="text-muted-foreground hidden text-sm sm:block">
            Marco KTH Innovation Readiness Level
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIMENSION_ORDER.map((code) => {
            const visual = getDimensionVisual(code);
            const copy = LANDING_COPY[code];
            return (
              <Card key={code} className="group p-5">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1 h-10 w-1 shrink-0 rounded-full ${visual.bg}`}
                  />
                  <div className="flex-1">
                    <p className={`text-overline ${visual.textInk}`}>{code}</p>
                    <h3 className="text-foreground mt-1 text-base font-semibold">{copy.name}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                      {copy.shortDescription}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
