import type { JSX } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '@pages/HomePage';
import QuestionnairePage from '@pages/QuestionnairePage';
import MaturityProfilePage from '@pages/MaturityProfilePage';
import RecommendationPage from '@pages/RecommendationPage';
import ScalingRoadmapPage from '@pages/ScalingRoadmapPage';
import InProgressPage from '@pages/InProgressPage';
import NotFoundPage from '@pages/NotFoundPage';
import AuthCallbackPage from '@pages/AuthCallbackPage';
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
 * Toda ruta autenticada está envuelta en `<ProtectedRoute>`, que desde
 * HU-01 redirige al Hub de INNLAB cuando no hay sesión. La única
 * excepción es `/auth/callback`, que por definición se visita sin
 * sesión.
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
        path="/diagnosticos/:id/recomendacion"
        element={
          <ProtectedRoute>
            <RecommendationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/diagnosticos/:id/roadmap"
        element={
          <ProtectedRoute>
            <ScalingRoadmapPage />
          </ProtectedRoute>
        }
      />

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
