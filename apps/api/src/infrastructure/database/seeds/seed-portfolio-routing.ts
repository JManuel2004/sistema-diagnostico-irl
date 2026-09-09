import type { EntityManager } from 'typeorm';
import { createHash } from 'node:crypto';
import {
  ESCALA_CALIBRACION,
  ETAPAS,
  FICHAS,
  PARAMETROS_SCORING,
  REGLAS_ELEGIBILIDAD,
  REGLAS_EXCEPCION,
  SERVICIOS,
} from './data/portfolio-routing.js';

/**
 * Siembra el catálogo de enrutamiento y publica la versión 1.
 *
 * Idempotente en el mismo sentido que el resto del seeder: se puede
 * correr n veces y el resultado es el mismo. Para las tablas versionadas
 * eso no puede hacerse con `ON CONFLICT DO UPDATE`, porque una versión
 * publicada es inmutable por diseño; la estrategia es distinta: si ya
 * existe una versión vigente, no se publica otra.
 *
 * Corre dentro de la transacción del runner, así que la configuración
 * queda completa o no queda nada. Una versión con fichas pero sin reglas
 * de excepción sería peor que ninguna: el motor arrancaría y daría
 * resultados silenciosamente incompletos.
 */
export async function seedPortfolioRouting(
  manager: EntityManager,
): Promise<{ versionPublicada: boolean }> {
  // ── Catálogos base (idempotentes por clave natural) ──────────────────
  for (const s of SERVICIOS) {
    await manager.query(
      `INSERT INTO irl_catalog.servicio_portafolio (nombre, descripcion, activo)
       VALUES ($1, $2, true)
       ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion`,
      [s.nombre, s.descripcion],
    );
  }

  for (const e of ETAPAS) {
    await manager.query(
      `INSERT INTO irl_catalog.etapa_iniciativa (codigo, nombre, orden, activo)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (codigo) DO UPDATE
         SET nombre = EXCLUDED.nombre, orden = EXCLUDED.orden`,
      [e.codigo, e.nombre, e.orden],
    );
  }

  // ── ¿Ya hay una versión vigente? ─────────────────────────────────────
  //
  // Publicar una segunda violaría `ux_version_unica_vigente`, y
  // sobrescribir la existente rompería la inmutabilidad de la que ya
  // pueda estar referenciada por recomendaciones emitidas.
  const [vigente] = await manager.query<{ numero: number }[]>(
    `SELECT numero FROM irl_catalog.version_configuracion WHERE estado = 'VIGENTE'`,
  );
  if (vigente) {
    return { versionPublicada: false };
  }

  const AUTOR = 'seed-inicial';

  // ── Snapshot de calibración ──────────────────────────────────────────
  const [{ id_snapshot_calibracion: idCalibracion }] = await manager.query<
    { id_snapshot_calibracion: string }[]
  >(
    `INSERT INTO irl_catalog.snapshot_calibracion (numero, autor_id, comentario, estado)
     VALUES (1, $1, $2, 'PUBLICADO')
     RETURNING id_snapshot_calibracion`,
    [AUTOR, 'Escala ordinal inicial — valores hipotéticos pendientes de INNLAB'],
  );

  for (const p of ESCALA_CALIBRACION) {
    await manager.query(
      `INSERT INTO irl_catalog.valor_etiqueta_calibracion
         (id_snapshot_calibracion, etiqueta, valor_numerico, orden_monotonia)
       VALUES ($1, $2, $3, $4)`,
      [idCalibracion, p.etiqueta, p.valor, p.orden],
    );
  }

  // ── Snapshot de parámetros ───────────────────────────────────────────
  const P = PARAMETROS_SCORING;
  const [{ id_snapshot_parametros: idParametros }] = await manager.query<
    { id_snapshot_parametros: string }[]
  >(
    `INSERT INTO irl_catalog.snapshot_parametros
       (numero, autor_id, comentario, peso_cuello_botella, peso_brecha,
        peso_desequilibrio_moderado, peso_desequilibrio_critico,
        peso_afinidad_etapa, penalizacion_fuera_rango, umbral_minimo,
        n_alternativas, estado)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PUBLICADO')
     RETURNING id_snapshot_parametros`,
    [
      AUTOR,
      'Pesos iniciales — valores hipotéticos pendientes de INNLAB',
      P.pesoCuelloBotella,
      P.pesoBrecha,
      P.pesoDesequilibrioModerado,
      P.pesoDesequilibrioCritico,
      P.pesoAfinidadEtapa,
      P.penalizacionFueraRango,
      P.umbralMinimo,
      P.nAlternativas,
    ],
  );

  // ── Versión ──────────────────────────────────────────────────────────
  const [{ id_version_configuracion: idVersion }] = await manager.query<
    { id_version_configuracion: string }[]
  >(
    `INSERT INTO irl_catalog.version_configuracion
       (numero, autor_id, comentario, id_snapshot_calibracion,
        id_snapshot_parametros, estado)
     VALUES (1, $1, $2, $3, $4, 'VIGENTE')
     RETURNING id_version_configuracion`,
    [
      AUTOR,
      'Configuración inicial del motor de enrutamiento (provisional)',
      idCalibracion,
      idParametros,
    ],
  );

  // ── Fichas ordinales + intensidades ──────────────────────────────────
  for (const ficha of FICHAS) {
    const etapas = ficha.etapasPertinentes.join(',');
    const [{ id_ficha_publicada: idFicha }] = await manager.query<
      { id_ficha_publicada: string }[]
    >(
      `INSERT INTO irl_catalog.ficha_ordinal_publicada
         (id_version_configuracion, id_servicio, nivel_min, nivel_max,
          etapas_pertinentes, hash_ficha)
       SELECT $1, s.id_servicio, $3, $4, $5, $6
         FROM irl_catalog.servicio_portafolio s
        WHERE s.nombre = $2
       RETURNING id_ficha_publicada`,
      [
        idVersion,
        ficha.servicio,
        ficha.nivelMin,
        ficha.nivelMax,
        etapas,
        hash({ ...ficha }),
      ],
    );

    for (const [dimension, etiqueta] of Object.entries(ficha.intensidades)) {
      await manager.query(
        `INSERT INTO irl_catalog.intensidad_ordinal_publicada
           (id_ficha_publicada, id_dimension, etiqueta)
         SELECT $1, d.id_dimension, $3
           FROM irl_catalog.dimension d
          WHERE d.codigo = $2`,
        [idFicha, dimension, etiqueta],
      );
    }
  }

  // ── Reglas de elegibilidad ───────────────────────────────────────────
  for (const regla of REGLAS_ELEGIBILIDAD) {
    await manager.query(
      `INSERT INTO irl_catalog.regla_elegibilidad_publicada
         (id_version_configuracion, id_servicio, predicado, arbol_expresion,
          mensaje_exclusion, hash_regla)
       SELECT $1, s.id_servicio, $3::jsonb, $4::jsonb, $5, $6
         FROM irl_catalog.servicio_portafolio s
        WHERE s.nombre = $2`,
      [
        idVersion,
        regla.servicio,
        JSON.stringify(regla.predicado),
        JSON.stringify(regla.predicado),
        regla.mensajeExclusion,
        hash(regla),
      ],
    );
  }

  // ── Reglas de excepción ──────────────────────────────────────────────
  for (const regla of REGLAS_EXCEPCION) {
    await manager.query(
      `INSERT INTO irl_catalog.regla_excepcion_publicada
         (id_version_configuracion, codigo, predicado, arbol_expresion, accion,
          id_servicio_objetivo, posiciones, motivo_declarado, prioridad_orden,
          hash_regla)
       SELECT $1, $2, $3::jsonb, $4::jsonb, $5, s.id_servicio, $7, $8, $9, $10
         FROM irl_catalog.servicio_portafolio s
        WHERE s.nombre = $6`,
      [
        idVersion,
        regla.codigo,
        JSON.stringify(regla.predicado),
        JSON.stringify(regla.predicado),
        regla.accion,
        regla.servicioObjetivo,
        regla.posiciones,
        regla.motivoDeclarado,
        regla.prioridadOrden,
        hash(regla),
      ],
    );
  }

  return { versionPublicada: true };
}

/**
 * Huella del artefacto publicado. Sirve para detectar si dos versiones
 * comparten una ficha o regla idéntica sin compararlas campo a campo.
 */
function hash(valor: unknown): string {
  return createHash('sha256').update(JSON.stringify(valor)).digest('hex');
}
