import type { JSX } from 'react';
import { paths } from '@/shared/lib/paths';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import LandingPage from '@pages/LandingPage';
import StartDiagnosticPage from '@pages/StartDiagnosticPage';
import DiagnosticWizardPage from '@pages/DiagnosticWizardPage';
import ResultsPage from '@pages/ResultsPage';
import InitiativePage from '@pages/InitiativePage';
import DashboardPage from '@pages/DashboardPage';
import NotFoundPage from '@pages/NotFoundPage';
import AuthCallbackPage from '@pages/AuthCallbackPage';
import { wizardPath, type WizardStepKey } from '@pages/wizard/wizard-steps';
import { ProtectedRoute } from './ProtectedRoute';

/**
 * The three result screens that existed (`/perfil`, `/recomendacion`,
 * `/roadmap`) are now a single one, `/resultados`. The old routes redirect
 * so a saved link does not land on a 404.
 */
function RedirectToResults(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={paths.results(id ?? '')} replace />;
}

/**
 * The questionnaire and the consent are no longer screens of their own but
 * wizard steps (`/asistente/:step`); their old routes lead to the step.
 */
function RedirectToWizardStep({ step }: { readonly step: WizardStepKey }): JSX.Element {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={wizardPath(id ?? '', step)} replace />;
}

/**
 * Route table.
 *
 * The user flow is: landing (`/`, public, no navigation) →
 * `/diagnosticos/nuevo` (resolves the session and the diagnostic) → wizard
 * (`/diagnosticos/:id/asistente/:step`: consent, initiative, questionnaire
 * and summary, no navigation) → results (`/diagnosticos/:id/resultados`),
 * the first screen with navigation, from where the panel (`/panel`) is
 * reached.
 *
 * Every authenticated route is wrapped in `<ProtectedRoute>`, which
 * redirects to the INNLAB Hub when there is no session and brings the user
 * back to the requested route on return. The exceptions are the landing,
 * which is public, and `/auth/callback`, which by definition is visited
 * without a session.
 */
export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* The landing used to live at /diagnosticos, protected; it is now «/». */}
      <Route path="/diagnosticos" element={<Navigate to="/" replace />} />

      <Route
        path="/diagnosticos/nuevo"
        element={
          <ProtectedRoute>
            <StartDiagnosticPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/diagnosticos/:id/asistente/:step?"
        element={
          <ProtectedRoute>
            <DiagnosticWizardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/diagnosticos/:id/consentimiento"
        element={<RedirectToWizardStep step="consentimiento" />}
      />
      <Route
        path="/diagnosticos/:id/cuestionario"
        element={<RedirectToWizardStep step="cuestionario" />}
      />

      <Route
        path="/diagnosticos/:id/resultados"
        element={
          <ProtectedRoute>
            <ResultsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/panel"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Correcting the initiative once the wizard is finished. */}
      <Route
        path="/diagnosticos/:id/iniciativa"
        element={
          <ProtectedRoute>
            <InitiativePage />
          </ProtectedRoute>
        }
      />

      {/* Former routes: profile, recommendation and roadmap are now /resultados. */}
      <Route path="/diagnosticos/:id/perfil" element={<RedirectToResults />} />
      <Route path="/diagnosticos/:id/recomendacion" element={<RedirectToResults />} />
      <Route path="/diagnosticos/:id/roadmap" element={<RedirectToResults />} />

      {/*
        Public on purpose: the user arrives here still without a session,
        back from the INNLAB Hub with `?code=`. Wrapping it in
        <ProtectedRoute> would send it to the Hub again, in a loop.
      */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
