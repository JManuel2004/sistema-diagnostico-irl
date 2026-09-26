import type { Initiative } from '../../domain/entities/initiative.aggregate.js';
import { type InitiativeRepositoryPort } from '../../domain/repositories/initiative.repository.port.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { ForbiddenError } from '../../../../shared/kernel/domain/errors/forbidden.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

/**
 * The initiative `initiativeId` when it belongs to `userId`:
 * `NotFoundError` if it does not exist, `ForbiddenError` if it is someone
 * else's — the same answers as the diagnostic ownership check of this module.
 */
export async function findOwnInitiative(
  initiatives: InitiativeRepositoryPort,
  initiativeId: string,
  userId: string,
): Promise<Result<Initiative, NotFoundError | ForbiddenError>> {
  const initiative = await initiatives.findById(initiativeId);
  if (!initiative) return Result.err(new NotFoundError('Initiative', initiativeId));
  if (!initiative.isOwnedBy(userId)) {
    return Result.err(new ForbiddenError('The initiative belongs to another user'));
  }
  return Result.ok(initiative);
}
