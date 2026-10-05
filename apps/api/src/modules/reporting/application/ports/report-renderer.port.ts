import type { ReportDocumentModel } from '../dtos/report-document.js';

export const REPORT_RENDERER = Symbol('REPORT_RENDERER');

/**
 * Draws the report's document as a PDF file. What the file says is decided
 * before (`buildReportDocument`); the renderer only lays the blocks out on
 * pages, so a different format would be another adapter of this port.
 */
export interface ReportRendererPort {
  render(document: ReportDocumentModel): Promise<Uint8Array>;
}
