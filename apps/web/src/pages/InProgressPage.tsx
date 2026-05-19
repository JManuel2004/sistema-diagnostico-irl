import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { PageShell } from '@/shared/ui/page-shell';

/**
 * Placeholder genérico para rutas que existen en la tabla
 * documentada (MODULES.md) pero que aún no son parte de las tres
 * historias objetivo de Stage 1.
 *
 * Cada consumidor pasa un label corto y la HU que sustituirá el
 * stub, así que cualquiera que navegue a la ruta entiende por qué
 * está vacía. Mantiene la chrome institucional para que la falta
 * de implementación no se sienta como un error del sistema.
 */
interface InProgressPageProps {
  readonly title: string;
  readonly story: string;
}

function ConstructionIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

export default function InProgressPage({ title, story }: InProgressPageProps): JSX.Element {
  return (
    <PageShell width="standard">
      <Card className="overflow-hidden">
        <div className="border-border bg-surface-muted flex items-start gap-4 border-b p-6">
          <span className="bg-surface-emphasis text-azul-icesi rounded-md p-2">
            <ConstructionIcon />
          </span>
          <div className="flex-1">
            <p className="text-overline text-azul-icesi">En construcción</p>
            <h1
              id="in-progress-title"
              className="text-foreground mt-1 text-2xl font-bold leading-tight tracking-tight"
            >
              {title}
            </h1>
          </div>
        </div>

        <CardContent className="space-y-4 p-6">
          <p className="text-foreground text-base leading-relaxed">
            Esta pantalla se implementará en una historia posterior ({story}). Permanece como
            placeholder durante la etapa 1 de estabilización.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Mientras tanto, puedes explorar el cuestionario completo o regresar al inicio.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/diagnosticos/demo/cuestionario"
              className={buttonVariants({ size: 'default' })}
            >
              Ir al cuestionario
            </Link>
            <Link to="/" className={buttonVariants({ variant: 'secondary' })}>
              Volver al inicio
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
