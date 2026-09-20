import type { JSX } from 'react';
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
 * Las tres pantallas de resultados que existían (`/perfil`, `/recomendacion`,
 * `/roadmap`) son ahora una sola, `/resultados`. Las rutas viejas redirigen
 * para que un enlace guardado no caiga en un 404.
 */
function RedirectToResults(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/diagnosticos/${id ?? ''}/resultados`} replace />;
}

/**
 * El cuestionario y el consentimiento ya no son pantallas propias sino pasos
 * del asistente (`/asistente/:paso`); sus rutas viejas llevan al paso.
 */
function RedirectToWizardStep({ step }: { readonly step: WizardStepKey }): JSX.Element {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={wizardPath(id ?? '', step)} replace />;
}

/**
 * Tabla de rutas.
 *
 * El flujo del usuario es: portada (`/`, pública, sin navegación) →
 * `/diagnosticos/nuevo` (resuelve la sesión y el diagnóstico) → asistente
 * (`/diagnosticos/:id/asistente/:paso`: iniciativa, consentimiento,
 * cuestionario y resumen, sin navegación) → resultados
 * (`/diagnosticos/:id/resultados`), la primera pantalla con navegación, desde
 * donde se llega al panel (`/panel`).
 *
 * Toda ruta autenticada está envuelta en `<ProtectedRoute>`, que desde
 * HU-01 redirige al Hub de INNLAB cuando no hay sesión y devuelve al usuario
 * a la ruta pedida al volver. Las excepciones son la portada, que es pública, y
 * `/auth/callback`, que por definición se visita sin sesión.
 */
export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* La portada estaba en /diagnosticos, protegida; ahora es «/». */}
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
        path="/diagnosticos/:id/asistente/:paso?"
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

      {/* Corregir la iniciativa una vez terminado el asistente. */}
      <Route
        path="/diagnosticos/:id/iniciativa"
        element={
          <ProtectedRoute>
            <InitiativePage />
          </ProtectedRoute>
        }
      />

      {/* Rutas anteriores: perfil, recomendación y roadmap ahora son /resultados. */}
      <Route path="/diagnosticos/:id/perfil" element={<RedirectToResults />} />
      <Route path="/diagnosticos/:id/recomendacion" element={<RedirectToResults />} />
      <Route path="/diagnosticos/:id/roadmap" element={<RedirectToResults />} />

      {/*
        Publica a proposito: el usuario llega aqui todavia sin sesion,
        de vuelta desde el Hub de INNLAB con `?code=`. Envolverla en
        <ProtectedRoute> la mandaria de nuevo al Hub, en bucle.
      */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
