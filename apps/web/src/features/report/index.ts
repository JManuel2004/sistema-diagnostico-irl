// Public surface of the feature. Whatever is not re-exported here is
// internal — the project's feature isolation rule.
export {
  ReportAttributionSection,
  ReportInitiativeSection,
  ReportProfileSection,
  ReportSection,
} from './components/ReportDocument';
export { ReportAnswers } from './components/ReportAnswers';
export { FullReportCard } from './components/FullReportCard';
export { DownloadReportButton, REPORT_NOT_AVAILABLE } from './components/DownloadReportButton';
export { useDiagnosticReport } from './hooks/useDiagnosticReport';
