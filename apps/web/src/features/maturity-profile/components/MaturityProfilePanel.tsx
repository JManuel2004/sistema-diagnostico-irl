import type { JSX } from 'react';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { MaturityRadarChart } from './MaturityRadarChart';

interface MaturityProfilePanelProps {
  profile: MaturityProfileResponse;
}

/**
 * Panel completo del perfil de madurez (DIAGIRL-36).
 *
 * Compone:
 *   - Encabezado con overline + h1 ("Tu radar IRL")
 *   - El `MaturityRadarChart`
 *   - Pie con timestamp del cálculo + atribución KTH obligatoria
 *     (RNF-09: "Marco IRL © KTH Innovation. Licencia CC BY-NC-SA 4.0")
 *
 * Layout: container `max-w-5xl` per DESIGN.md → "Standard container —
 * maturity profile (radar + dimension grid)". Background blanco puro y
 * el contenedor del radar con un `surface-emphasis` (wash sutil de
 * Azul Icesi) para darle peso visual sin oscurecer el fondo.
 */
export function MaturityProfilePanel({ profile }: MaturityProfilePanelProps): JSX.Element {
  const bottleneckCodes = profile.bottleneck?.dimensions ?? [];
  const computedAtLabel = new Date(profile.computedAt).toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6">
      <header className="mb-8">
        <p className="text-overline text-azul-icesi">Perfil de Madurez</p>
        <h1 className="text-foreground mt-2 text-[2.25rem] font-bold leading-tight tracking-tight">
          Tu radar IRL
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
          El gráfico muestra el nivel actual (1–9) en cada una de las 6 dimensiones del marco IRL.
          Los puntos en rojo señalan dimensiones con prioridad de atención (nivel ≤ 3).
        </p>
      </header>

      <div className="bg-surface-emphasis border-border rounded-lg border p-6 md:p-10">
        <MaturityRadarChart
          dimensionResults={profile.dimensionResults}
          bottleneckDimensions={bottleneckCodes}
        />
      </div>

      <footer className="text-muted-foreground mt-8 flex flex-col gap-2 text-xs md:flex-row md:items-center md:justify-between">
        <p>Calculado el {computedAtLabel}.</p>
        <p>
          Marco IRL © KTH Innovation. Licencia{' '}
          <a
            className="underline decoration-dotted underline-offset-2"
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-NC-SA 4.0
          </a>
          .
        </p>
      </footer>
    </section>
  );
}
