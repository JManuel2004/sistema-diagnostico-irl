import type { JSX } from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage(): JSX.Element {
  return (
    <main className="mx-auto my-24 max-w-md space-y-4 px-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">404 — Página no encontrada</h1>
      <p className="text-muted-foreground">
        La dirección que intentas abrir no existe en este sistema.
      </p>
      <p>
        <Link to="/" className="text-primary font-medium underline-offset-4 hover:underline">
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}
