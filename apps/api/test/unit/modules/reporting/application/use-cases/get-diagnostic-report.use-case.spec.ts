import { beforeEach, describe, expect, it } from '@jest/globals';
import { diagnosticReportSchema, IRL_ATTRIBUTION } from '@innlab/contracts';
import { GetDiagnosticReportUseCase } from '../../../../../../src/modules/reporting/application/use-cases/get-diagnostic-report.use-case.js';
import type { ReportSourcesPort } from '../../../../../../src/modules/reporting/application/ports/report-sources.port.js';
import { ReportNotAvailableError } from '../../../../../../src/modules/reporting/domain/exceptions/report.errors.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';
import {
  aDiagnostic,
  someAnswers,
  anInitiative,
  aProfile,
  aRecommendation,
  aRoadmap,
  DIAGNOSTIC_ID,
} from '../../support/report-sections.js';

const QUERY = { diagnosticId: DIAGNOSTIC_ID, userId: 'user-1' };

describe('GetDiagnosticReportUseCase', () => {
  let sources: ReportSourcesPort;
  let reads: string[];

  beforeEach(() => {
    reads = [];
    sources = {
      diagnostic: () => {
        reads.push('diagnostic');
        return Promise.resolve(Result.ok(aDiagnostic()));
      },
      initiative: () => {
        reads.push('initiative');
        return Promise.resolve(Result.ok(anInitiative()));
      },
      answers: () => {
        reads.push('answers');
        return Promise.resolve(
          Result.ok({ diagnosticId: DIAGNOSTIC_ID, dimensions: someAnswers() }),
        );
      },
      profile: () => {
        reads.push('profile');
        return Promise.resolve(Result.ok(aProfile()));
      },
      recommendation: () => {
        reads.push('recommendation');
        return Promise.resolve(Result.ok(aRecommendation()));
      },
      roadmap: () => {
        reads.push('roadmap');
        return Promise.resolve(Result.ok(aRoadmap()));
      },
    };
  });

  it('gathers the initiative, the profile, the recommendation and the roadmap as the contract describes', async () => {
    const result = await new GetDiagnosticReportUseCase(sources).execute(QUERY);

    if (!result.ok) throw new Error('expected ok result');
    const report = diagnosticReportSchema.parse(result.value);
    expect(report.initiative.name).toBe('AgroConecta');
    expect(report.profile.dimensionResults).toHaveLength(6);
    expect(report.recommendation.primary?.name).toBe(
      'Célula de Grado · Posgrado',
    );
    expect(report.roadmap.phases).toHaveLength(1);
    expect(report.frameworkVersion).toBe('KTH-IRL-1.0');
  });

  it('carries what the user answered to each statement, by dimension', async () => {
    const result = await new GetDiagnosticReportUseCase(sources).execute(QUERY);

    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.answers.map((d) => d.dimensionCode)).toEqual([
      'TRL',
      'CRL',
      'BRL',
      'IPRL',
      'TmRL',
      'FRL',
    ]);
    expect(result.value.answers.flatMap((d) => d.answers)).toHaveLength(48);
  });

  it('carries the attribution of the KTH framework and its license (RNF-09)', async () => {
    const result = await new GetDiagnosticReportUseCase(sources).execute(QUERY);

    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.attribution).toEqual(IRL_ATTRIBUTION);
    expect(result.value.attribution.license).toBe('CC BY-NC-SA 4.0');
  });

  it('dates the report when the deep analysis finished: the later of its two results', async () => {
    sources.recommendation = () =>
      Promise.resolve(Result.ok(aRecommendation('2026-01-02T10:00:05.000Z')));
    sources.roadmap = () =>
      Promise.resolve(Result.ok(aRoadmap('2026-01-02T10:00:01.000Z')));

    const result = await new GetDiagnosticReportUseCase(sources).execute(QUERY);

    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.completedAt).toBe('2026-01-02T10:00:05.000Z');
  });

  it.each(['PROFILE_GENERATED', 'DEEP_ANALYSIS_IN_PROGRESS'] as const)(
    'in %s the report is not available yet, and no result is read',
    async (state) => {
      sources.diagnostic = () => {
        reads.push('diagnostic');
        return Promise.resolve(
          Result.ok(
            aDiagnostic({
              state,
              deepAnalysisAccepted: state === 'DEEP_ANALYSIS_IN_PROGRESS',
              deepAnalysisCompleted: false,
            }),
          ),
        );
      };

      const result = await new GetDiagnosticReportUseCase(sources).execute(
        QUERY,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBeInstanceOf(ReportNotAvailableError);
      expect(result.error.code).toBe('REPORT_NOT_AVAILABLE');
      expect(reads).toEqual(['diagnostic']);
    },
  );

  it("answers someone else's diagnostic as missing, before reading any result", async () => {
    sources.diagnostic = () => {
      reads.push('diagnostic');
      return Promise.resolve(
        Result.err(new NotFoundError('Diagnosis', DIAGNOSTIC_ID)),
      );
    };

    const result = await new GetDiagnosticReportUseCase(sources).execute(QUERY);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(reads).toEqual(['diagnostic']);
  });

  it('propagates a missing section instead of serving a partial report', async () => {
    sources.initiative = () =>
      Promise.resolve(
        Result.err(new NotFoundError('Initiative', DIAGNOSTIC_ID)),
      );

    const result = await new GetDiagnosticReportUseCase(sources).execute(QUERY);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
