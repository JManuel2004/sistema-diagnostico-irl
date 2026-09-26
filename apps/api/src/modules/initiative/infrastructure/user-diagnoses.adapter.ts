import { Injectable } from '@nestjs/common';
import type { DiagnosticSummary } from '@innlab/contracts';
import { ListUserDiagnosesQuery } from '../../diagnosis/application/use-cases/list-user-diagnoses.query.js';
import type { UserDiagnosesPort } from '../application/ports/user-diagnoses.port.js';

/** Answers `UserDiagnosesPort` with `diagnosis/`'s exported read query. */
@Injectable()
export class UserDiagnosesAdapter implements UserDiagnosesPort {
  constructor(private readonly listUserDiagnoses: ListUserDiagnosesQuery) {}

  listByUser(userId: string): Promise<DiagnosticSummary[]> {
    return this.listUserDiagnoses.execute(userId);
  }
}
