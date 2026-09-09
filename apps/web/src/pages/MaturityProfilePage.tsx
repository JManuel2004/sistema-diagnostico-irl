import type { JSX } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MaturityProfilePanel, useMaturityProfile } from '@features/maturity-profile';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';

export default function MaturityProfilePage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: profile, error, isError } = useMaturityProfile(diagnosticId);

  if (!diagnosticId) {
    return <Navigate to="/diagnosticos" replace />;
  }

  if (profile) {
    return (
      <>
        <MaturityProfilePanel profile={profile} />
        {/*
          CTA hacia el análisis profundo (RF-11 / RF-15). Vive en la página
          y no en `MaturityProfilePanel` porque ese componente pertenece a
          la feature `maturity-profile`, que no puede navegar hacia una
          ruta de otra feature (`portfolio-recommendation`) sin romper el
          aislamiento por feature de `apps/web/CLAUDE.md`. La página, en
          cambio, sí puede orquestar la navegación entre ambas.
        */}
        <div className="mx-auto w-full max-w-6xl px-4 pb-12 md:px-6">
          <div className="border-border flex flex-wrap justify-end gap-3 border-t pt-6">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => void navigate(`/diagnosticos/${diagnosticId}/roadmap`)}
            >
              Ver roadmap de escalamiento
            </Button>
            <Button
              size="lg"
              onClick={() => void navigate(`/diagnosticos/${diagnosticId}/recomendacion`)}
            >
              Generar recomendación
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </>
    );
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
