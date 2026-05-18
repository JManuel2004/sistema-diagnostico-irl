import { z } from 'zod';

/**
 * Identificador único universal (UUID v4 generado por la aplicación).
 *
 * Convención del proyecto (PROJECT-SUMMARY.md §1.8): toda llave primaria
 * es un UUID generado en el código antes de persistir, no por la base
 * de datos, para que las entidades de dominio puedan construirse sin
 * roundtrip.
 *
 * Se centraliza aquí para que cualquier schema reutilice el mismo
 * validador en vez de inline `z.string().uuid()` — una sola fuente
 * para el mensaje de error y para el formato.
 */
export const uuidSchema = z.string().uuid().describe('UUID v4');

export type Uuid = z.infer<typeof uuidSchema>;
