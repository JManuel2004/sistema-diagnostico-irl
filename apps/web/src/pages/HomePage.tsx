import type { JSX } from 'react';
import { Link } from 'react-router-dom';

/**
 * Landing de phase 1.
 *
 * En Stage 2 esta página se vuelve la entrada a `features/diagnostic`:
 * listar diagnósticos previos (HU-03), botón de "iniciar nuevo"
 * (HU-04), badge del usuario desde `features/auth`.
 *
 * Para Stage 1 entrega un enlace directo al único feature que existe
 * después de Stage 2 — el cuestionario — para que un dev pueda
 * navegar al feature objetivo sin tener que recordar la URL.
 */
export default function HomePage(): JSX.Element {
  return (
    <main className="mx-auto my-16 max-w-2xl space-y-6 px-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Diagnóstico IRL — INNLAB</h1>
      <p className="text-muted-foreground">
        Sistema de evaluación de madurez basado en el marco KTH Innovation Readiness Level.
      </p>
      <p>
        <Link
          to="/diagnosticos/demo/cuestionario"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          Abrir el cuestionario
        </Link>
      </p>
    </main>
  );
}
