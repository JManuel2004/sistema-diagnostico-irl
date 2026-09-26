// Public surface of the questionnaire feature. Anything not re-exported
// here is considered internal — the project's feature-isolation rule.
export { QuestionnaireView } from './components/QuestionnaireView';
export { AnswersSummary } from './components/AnswersSummary';
export {
  selectAnswers,
  selectClearDraft,
  selectDraftDiagnosticId,
  selectInitialize,
  selectJustifications,
  useQuestionnaireDraftStore,
} from './store/questionnaire-draft.store';
export { useQuestionnaireCompletion } from './hooks/useQuestionnaireCompletion';
export { useQuestionnaireStructure } from './hooks/useQuestionnaireStructure';
