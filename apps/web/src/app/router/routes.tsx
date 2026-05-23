import type { JSX } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '@pages/HomePage';
import QuestionnairePage from '@pages/QuestionnairePage';
import MaturityProfilePage from '@pages/MaturityProfilePage';
import InProgressPage from '@pages/InProgressPage';
import NotFoundPage from '@pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';

/**
 * Tabla de rutas.
 *
 * El set de paths espeja `apps/web/docs/MODULES.md`. Dentro de las
 * tres historias objetivo solo `/diagnosticos/:id/cuestionario`
 * carga implementación real (en Stage 2); las demás rutas devuelven
 * un `<InProgressPage>` que nombra la HU que eventualmente las
 * reemplazará.
 *
 * Toda ruta autenticada está envuelta en `<ProtectedRoute>` aunque
 * ahora sea no-op (ver `ProtectedRoute.tsx`). El wrapper es
 * documentación intencional — cuando Stage 2 introduzca auth real,
 * la tabla de rutas no se edita, solo el wrapper.
 */
export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/diagnosticos" replace />} />

      <Route
        path="/diagnosticos"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/diagnosticos/nuevo"
        element={
          <ProtectedRoute>
            <InProgressPage title="Nuevo diagnóstico" story="HU-04 / RF-02" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/diagnosticos/:id/consentimiento"
        element={
          <ProtectedRoute>
            <InProgressPage title="Consentimiento de tratamiento de datos" story="HU-05 / RF-03" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/diagnosticos/:id/iniciativa"
        element={
          <ProtectedRoute>
            <InProgressPage title="Información de la iniciativa" story="HU-06 / RF-04" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/diagnosticos/:id/cuestionario"
        element={
          <ProtectedRoute>
            <QuestionnairePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/diagnosticos/:id/perfil"
        element={
          <ProtectedRoute>
            <MaturityProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/auth/callback"
        element={<InProgressPage title="Procesando inicio de sesión" story="HU-01 / RF-00" />}
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
