import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/shared/ui/button';
import { PageShell } from '@/shared/ui/page-shell';

/**
 * Página de error 404.
 *
 * Mantiene la chrome institucional (descriptor INNLAB en el header)
 * para que el usuario sepa que sigue dentro del sistema y no en una
 * página rota del proveedor de hosting.
 */
export default function NotFoundPage(): JSX.Element {
  return (
    <PageShell width="standard">
      <div className="mx-auto max-w-xl py-16 text-left">
        <p className="text-overline text-azul-icesi">Error 404</p>
        <h1 className="text-display tracking-tightest text-foreground mt-3 font-bold leading-[1.05]">
          Página no encontrada.
        </h1>
        <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
          La dirección que intentas abrir no existe en este sistema. Es posible que el enlace esté
          desactualizado o que la ruta haya cambiado.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className={buttonVariants({ size: 'default' })}>
            Volver al inicio
          </Link>
          <Link
            to="/diagnosticos/demo/cuestionario"
            className={buttonVariants({ variant: 'secondary' })}
          >
            Abrir el cuestionario
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
