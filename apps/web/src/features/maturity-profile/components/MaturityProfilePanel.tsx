import type { JSX } from 'react';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { MaturityRadarChart } from './MaturityRadarChart';
import { MaturityProfileSummary } from './MaturityProfileSummary';

interface MaturityProfilePanelProps {
  profile: MaturityProfileResponse;
}

export function MaturityProfilePanel({ profile }: MaturityProfilePanelProps): JSX.Element {
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
        <div className="bg-surface-emphasis rounded-lg p-6 md:p-10">
          <MaturityRadarChart
            dimensionResults={profile.dimensionResults}
            imbalances={profile.imbalances}
          />
        </div>
        <MaturityProfileSummary
          dimensionResults={profile.dimensionResults}
          bottleneck={profile.bottleneck}
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
