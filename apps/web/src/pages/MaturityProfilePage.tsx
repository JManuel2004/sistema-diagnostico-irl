import type { JSX } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { MaturityProfilePanel, useMaturityProfile } from '@features/maturity-profile';
import { PageShell } from '@/shared/ui/page-shell';

export default function MaturityProfilePage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const { data: profile, error, isError } = useMaturityProfile(diagnosticId);

  if (!diagnosticId) {
    return <Navigate to="/diagnosticos" replace />;
  }

  if (profile) {
    return <MaturityProfilePanel profile={profile} />;
  }

  if (isError) {
    return (
      <PageShell width="standard" showAttribution>
        <div
          role="alert"
          className="border-critical/30 bg-critical-bg mx-auto mt-12 max-w-xl rounded-md border p-6 text-center"
        >
          <p className="text-critical text-base font-semibold">
            No fue posible generar el diagnóstico
          </p>
          <p className="text-critical mt-2 text-sm">
            {error?.message ?? 'Por favor, intenta de nuevo en unos minutos.'}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="standard" showAttribution>
      <div className="mx-auto mt-16 flex max-w-xl flex-col items-center gap-4 text-center">
        <div
          className="border-azul-icesi/40 size-10 animate-spin rounded-full border-2 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-foreground text-base">Cargando perfil…</p>
      </div>
    </PageShell>
  );
}
