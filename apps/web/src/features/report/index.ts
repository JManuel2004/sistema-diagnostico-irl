// Public surface of the feature. Whatever is not re-exported here is
// internal — the project's feature isolation rule.
export { ReportDocument } from './components/ReportDocument';
export { FullReportCard } from './components/FullReportCard';
export { DownloadReportButton, REPORT_NOT_AVAILABLE } from './components/DownloadReportButton';
export { useDiagnosticReport } from './hooks/useDiagnosticReport';
