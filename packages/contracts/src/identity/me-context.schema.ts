import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Contexto de la sesión activa (RF-01 / DIAGIRL-25).
 *
 * Endpoint: `GET /api/v1/diagnosticos/../me/context` — en realidad
 * `GET /api/v1/me/context`.
 *
 * Reparte los datos por su dueño, y esa separación es intencional:
 *
 *   - `user` — identidad de la persona. El `id` es el `sub` de Cognito y
 *     es el mismo en todos los productos del ecosistema. Nombre y correo
 *     NO viajan en el access token del pool compartido (solo trae `sub`),
 *     así que los sirve el backend tras pedírselos a INNLAB Core.
 *   - `core` — pertenencia organizacional, propiedad exclusiva de Core.
 *
 * `companyId` y `companyRole` llegan `null` mientras el usuario no
 * pertenezca a ninguna empresa, y `workspaceId` llega `null` siempre:
 * los workspaces no están activos del lado de Core. Un `null` ahí es el
 * contrato, no un fallo.
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
        id: uuidSchema.describe('`sub` de Cognito — identificador único del usuario'),
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
