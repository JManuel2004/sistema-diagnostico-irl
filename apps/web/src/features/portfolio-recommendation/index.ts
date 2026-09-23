// Public surface of the feature. Whatever is not re-exported here is
// internal — the project's feature isolation rule.
export { RecommendationSummary } from './components/RecommendationSummary';
export { LayerTracePanel } from './components/LayerTracePanel';
export {
  useRecommendation,
  useRecommendationTrace,
  useAcceptDeepAnalysis,
} from './hooks/useRecommendation';
