import type { JSX } from 'react';
import { paths } from '@/shared/lib/paths';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/shared/ui/button';
import { PageShell } from '@/shared/ui/page-shell';

/**
 * 404 error page.
 *
 * It keeps the institutional chrome (INNLAB descriptor in the header) so the
 * user knows they are still inside the system and not on a broken page of
 * the hosting provider.
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
          <Link to={paths.landing} className={buttonVariants({ size: 'default' })}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
