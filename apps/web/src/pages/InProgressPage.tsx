import type { JSX } from 'react';

/**
 * Placeholder genérico para rutas que existen en la tabla documentada
 * (MODULES.md) pero que no son parte de las tres historias objetivo
 * de Stage 1.
 *
 * Cada consumidor pasa un label corto y la HU que eventualmente
 * sustituirá el stub, así que cualquiera que navegue a la ruta
 * entiende por qué está vacía.
 */
interface InProgressPageProps {
  readonly title: string;
  readonly story: string;
}

export default function InProgressPage({ title, story }: InProgressPageProps): JSX.Element {
  return (
    <main
      aria-labelledby="in-progress-title"
      className="mx-auto my-16 max-w-2xl space-y-4 px-8 text-center"
    >
      <h1 id="in-progress-title" className="text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-muted-foreground">
        Esta pantalla se implementará en una historia posterior ({story}). Permanece como
        placeholder durante la etapa 1 de estabilización.
      </p>
    </main>
  );
}
