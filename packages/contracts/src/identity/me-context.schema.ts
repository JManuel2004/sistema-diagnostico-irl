import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Context of the active session (RF-01 / DIAGIRL-25), served by
 * `GET /api/v1/me/context`.
 *
 * The data is split by its owner, on purpose:
 *
 *   - `user` — the person's identity. `id` is the Cognito `sub`, the same
 *     in every product of the ecosystem. Name and email do NOT travel in
 *     the shared pool's access token (it only carries `sub`), so the
 *     backend serves them after asking INNLAB Core.
 *   - `core` — organizational membership, owned exclusively by Core.
 *
 * `companyId` and `companyRole` are `null` while the user belongs to no
 * company, and `workspaceId` is always `null`: workspaces are not active
 * on Core's side. A `null` there is the contract, not a failure.
 */
export const companyMembershipSchema = z
  .object({
    id: uuidSchema,
    name: z.string(),
    role: z.string(),
  })
  .strict();

export const meContextResponseSchema = z
  .object({
    user: z
      .object({
        id: uuidSchema.describe('Cognito `sub` — the unique identifier of the user'),
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string(),
      })
      .strict(),
    core: z
      .object({
        companyId: uuidSchema.nullable(),
        companyRole: z.string().nullable(),
        workspaceId: z.string().nullable(),
        companies: z.array(companyMembershipSchema),
      })
      .strict(),
  })
  .strict();

export type CompanyMembership = z.infer<typeof companyMembershipSchema>;
export type MeContextResponse = z.infer<typeof meContextResponseSchema>;
