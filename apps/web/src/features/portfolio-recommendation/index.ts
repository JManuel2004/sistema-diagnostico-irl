// Superficie pública de la feature. Lo que no se reexporta aquí es
// interno — regla de aislamiento por feature de `apps/web/CLAUDE.md`.
export { RecommendationSummary } from './components/RecommendationSummary';
export { LayerTracePanel } from './components/LayerTracePanel';
export {
  useRecommendation,
  useRecommendationTrace,
  useGenerateRecommendation,
} from './hooks/useRecommendation';
