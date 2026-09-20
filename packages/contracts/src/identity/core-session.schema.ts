import { z } from 'zod';

/**
 * Sesión del ecosistema INNLAB, tal como la entrega INNLAB Core en el
 * intercambio SSO (`GET /auth/sso/exchange`) y tal como el frontend la guarda
 * y la relee de `localStorage`.
 *
 * Se valida en las dos superficies porque ninguna es de confianza: la
 * respuesta viene de un servicio externo y el almacenamiento del navegador
 * se puede editar fuera de la aplicación. Un valor que no cumple el schema
 * se trata como «sin sesión», no como una sesión a medias.
 *
 * `accessToken` es el único que autentica (Core exige `token_use ===
 * 'access'`). `token` es el id_token: se guarda porque Core lo entrega junto,
 * pero no se usa como credencial, y una sesión sin él sigue siendo utilizable,
 * así que si falta se toma como cadena vacía en vez de rechazar la sesión.
 */
export const coreSessionSchema = z
  .object({
    token: z.string().default('').describe('id_token. Identifica al usuario; no autentica.'),
    accessToken: z.string().min(1).describe('access_token. El único válido como Bearer.'),
  })
  .describe('Sesión de INNLAB Core (id_token + access_token)');

export type CoreSession = z.infer<typeof coreSessionSchema>;
