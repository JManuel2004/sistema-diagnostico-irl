import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DownloadDiagnosticReportUseCase } from '../../../../../../src/modules/reporting/application/use-cases/download-diagnostic-report.use-case.js';
import type { GetDiagnosticReportUseCase } from '../../../../../../src/modules/reporting/application/use-cases/get-diagnostic-report.use-case.js';
import type { ReportRendererPort } from '../../../../../../src/modules/reporting/application/ports/report-renderer.port.js';
import { ReportNotAvailableError } from '../../../../../../src/modules/reporting/domain/exceptions/report.errors.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';
import { DIAGNOSTIC_ID } from '../../support/report-sections.js';
import { aReport } from '../../support/a-report.js';

const QUERY = { diagnosticId: DIAGNOSTIC_ID, userId: 'user-1' };
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

describe('DownloadDiagnosticReportUseCase', () => {
  let execute: jest.Mock<GetDiagnosticReportUseCase['execute']>;
  let render: jest.Mock<ReportRendererPort['render']>;
  let useCase: DownloadDiagnosticReportUseCase;

  beforeEach(() => {
    execute = jest.fn<GetDiagnosticReportUseCase['execute']>();
    render = jest.fn<ReportRendererPort['render']>().mockResolvedValue(PDF);
    useCase = new DownloadDiagnosticReportUseCase(
      { execute } as unknown as GetDiagnosticReportUseCase,
      { render },
    );
  });

  it('draws the report of the caller as a PDF, named after the initiative', async () => {
    execute.mockResolvedValueOnce(Result.ok(aReport()));

    const result = await useCase.execute(QUERY);

    if (!result.ok) throw new Error('expected ok result');
    expect(execute).toHaveBeenCalledWith(QUERY);
    expect(result.value).toEqual({
      fileName: 'reporte-irl-agroconecta-2026-01-02.pdf',
      contentType: 'application/pdf',
      content: PDF,
    });
    const drawn = render.mock.calls[0]?.[0];
    expect(drawn.title).toBe('Reporte del diagnóstico IRL: AgroConecta');
    expect(drawn.footer).toContain('CC BY-NC-SA 4.0');
  });

  it('without the deep analysis complete, draws nothing: REPORT_NOT_AVAILABLE', async () => {
    execute.mockResolvedValueOnce(
      Result.err(new ReportNotAvailableError(DIAGNOSTIC_ID)),
    );

    const result = await useCase.execute(QUERY);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('REPORT_NOT_AVAILABLE');
    expect(render).not.toHaveBeenCalled();
  });

  it("answers someone else's diagnostic as missing, and draws nothing", async () => {
    execute.mockResolvedValueOnce(
      Result.err(new NotFoundError('Diagnosis', DIAGNOSTIC_ID)),
    );

    const result = await useCase.execute(QUERY);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(render).not.toHaveBeenCalled();
  });
});
