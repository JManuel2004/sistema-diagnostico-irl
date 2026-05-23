import type { JSX } from 'react';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { MaturityRadarChart } from './MaturityRadarChart';
import { MaturityProfileSummary } from './MaturityProfileSummary';

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
 * Layout: container `max-w-6xl` para acomodar el grid de 2 columnas
 * (radar a la izquierda, panel de señales numéricas a la derecha) en
 * pantallas md+. En móvil ambos se apilan verticalmente. El radar
 * conserva su contenedor `surface-emphasis`; el resumen va sobre fondo
 * blanco para que las tarjetas tengan suficiente contraste y el ojo
 * descanse entre el radar y las señales (DIAGIRL-37).
 */
export function MaturityProfilePanel({ profile }: MaturityProfilePanelProps): JSX.Element {
  const bottleneckCodes = profile.bottleneck?.dimensions ?? [];
  const computedAtLabel = new Date(profile.computedAt).toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="bg-surface-emphasis border-border rounded-lg border p-6 md:p-10">
          <MaturityRadarChart
            dimensionResults={profile.dimensionResults}
            bottleneckDimensions={bottleneckCodes}
          />
        </div>
        <MaturityProfileSummary dimensionResults={profile.dimensionResults} />
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
