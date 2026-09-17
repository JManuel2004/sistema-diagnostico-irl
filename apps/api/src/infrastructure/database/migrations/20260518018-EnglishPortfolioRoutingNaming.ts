import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames the portfolio-routing tables, columns and stored enum values
 * from Spanish to English.
 *
 * Driven by tables rather than written as ~150 separate statements: the
 * mapping is the interesting part and keeping it as data makes the
 * inverse migration exact instead of hand-mirrored.
 *
 * `etapa_iniciativa` and `iniciativa` are NOT touched. They belong to
 * the initiative module, which has no domain layer yet and is out of
 * scope; the stage codes stored in `relevant_stages` therefore keep
 * their current values.
 */

/** `[schema, oldTable, newTable, [[oldColumn, newColumn], ...]]` */
const TABLES: readonly [string, string, string, readonly [string, string][]][] =
  [
    [
      'irl_catalog',
      'servicio_portafolio',
      'portfolio_service',
      [
        ['id_servicio', 'id'],
        ['nombre', 'name'],
        ['descripcion', 'description'],
        ['activo', 'is_active'],
      ],
    ],
    [
      'irl_catalog',
      'snapshot_calibracion',
      'calibration_snapshot',
      [
        ['id_snapshot_calibracion', 'id'],
        ['numero', 'number'],
        ['autor_id', 'author_id'],
        ['comentario', 'comment'],
        ['estado', 'state'],
        ['creado_en', 'created_at'],
      ],
    ],
    [
      'irl_catalog',
      'valor_etiqueta_calibracion',
      'calibration_label_value',
      [
        ['id_valor_etiqueta', 'id'],
        ['id_snapshot_calibracion', 'id_calibration_snapshot'],
        ['etiqueta', 'label'],
        ['valor_numerico', 'numeric_value'],
        ['orden_monotonia', 'monotonicity_order'],
      ],
    ],
    [
      'irl_catalog',
      'snapshot_parametros',
      'parameters_snapshot',
      [
        ['id_snapshot_parametros', 'id'],
        ['numero', 'number'],
        ['autor_id', 'author_id'],
        ['comentario', 'comment'],
        ['peso_cuello_botella', 'bottleneck_weight'],
        ['peso_brecha', 'gap_weight'],
        ['peso_desequilibrio_critico', 'critical_imbalance_weight'],
        ['peso_desequilibrio_moderado', 'moderate_imbalance_weight'],
        ['peso_afinidad_etapa', 'stage_affinity_weight'],
        ['penalizacion_fuera_rango', 'out_of_range_penalty'],
        ['umbral_minimo', 'minimum_threshold'],
        ['n_alternativas', 'alternatives_count'],
        ['estado', 'state'],
      ],
    ],
    [
      'irl_catalog',
      'version_configuracion',
      'configuration_version',
      [
        ['id_version_configuracion', 'id'],
        ['numero', 'number'],
        ['autor_id', 'author_id'],
        ['comentario', 'comment'],
        ['id_snapshot_calibracion', 'id_calibration_snapshot'],
        ['id_snapshot_parametros', 'id_parameters_snapshot'],
        ['estado', 'state'],
        ['vigente_desde', 'valid_from'],
        ['vigente_hasta', 'valid_until'],
      ],
    ],
    [
      'irl_catalog',
      'ficha_ordinal_publicada',
      'published_ordinal_profile',
      [
        ['id_ficha_publicada', 'id'],
        ['id_version_configuracion', 'id_configuration_version'],
        ['id_servicio', 'id_service'],
        ['nivel_min', 'min_level'],
        ['nivel_max', 'max_level'],
        ['etapas_pertinentes', 'relevant_stages'],
        ['hash_ficha', 'profile_hash'],
      ],
    ],
    [
      'irl_catalog',
      'intensidad_ordinal_publicada',
      'published_ordinal_intensity',
      [
        ['id_intensidad_publicada', 'id'],
        ['id_ficha_publicada', 'id_ordinal_profile'],
        ['etiqueta', 'label'],
      ],
    ],
    [
      'irl_catalog',
      'regla_elegibilidad_publicada',
      'published_eligibility_rule',
      [
        ['id_regla_elig_publicada', 'id'],
        ['id_version_configuracion', 'id_configuration_version'],
        ['id_servicio', 'id_service'],
        ['predicado', 'predicate'],
        ['arbol_expresion', 'expression_tree'],
        ['mensaje_exclusion', 'exclusion_message'],
        ['hash_regla', 'rule_hash'],
      ],
    ],
    [
      'irl_catalog',
      'regla_excepcion_publicada',
      'published_exception_rule',
      [
        ['id_regla_exc_publicada', 'id'],
        ['id_version_configuracion', 'id_configuration_version'],
        ['codigo', 'code'],
        ['predicado', 'predicate'],
        ['arbol_expresion', 'expression_tree'],
        ['accion', 'action'],
        ['id_servicio_objetivo', 'id_target_service'],
        ['posiciones', 'positions'],
        ['motivo_declarado', 'declared_reason'],
        ['prioridad_orden', 'priority_order'],
        ['hash_regla', 'rule_hash'],
      ],
    ],
    [
      'irl_catalog',
      'ficha_ordinal_borrador',
      'draft_ordinal_profile',
      [
        ['id_ficha_borrador', 'id'],
        ['id_servicio', 'id_service'],
        ['nivel_min', 'min_level'],
        ['nivel_max', 'max_level'],
        ['etapas_pertinentes', 'relevant_stages'],
        ['actualizado_en', 'updated_at'],
      ],
    ],
    [
      'irl_catalog',
      'intensidad_ordinal_borrador',
      'draft_ordinal_intensity',
      [
        ['id_intensidad_borrador', 'id'],
        ['id_ficha_borrador', 'id_ordinal_profile'],
        ['etiqueta', 'label'],
      ],
    ],
    [
      'irl_catalog',
      'regla_elegibilidad_borrador',
      'draft_eligibility_rule',
      [
        ['id_regla_elig_borrador', 'id'],
        ['id_servicio', 'id_service'],
        ['predicado', 'predicate'],
        ['arbol_expresion', 'expression_tree'],
        ['mensaje_exclusion', 'exclusion_message'],
        ['actualizado_en', 'updated_at'],
      ],
    ],
    [
      'irl_catalog',
      'regla_excepcion_borrador',
      'draft_exception_rule',
      [
        ['id_regla_exc_borrador', 'id'],
        ['codigo', 'code'],
        ['predicado', 'predicate'],
        ['arbol_expresion', 'expression_tree'],
        ['accion', 'action'],
        ['id_servicio_objetivo', 'id_target_service'],
        ['posiciones', 'positions'],
        ['motivo_declarado', 'declared_reason'],
        ['prioridad_orden', 'priority_order'],
        ['actualizado_en', 'updated_at'],
      ],
    ],
    [
      'irl_diagnostic',
      'recomendacion_portafolio',
      'portfolio_recommendation',
      [
        ['id_recomendacion', 'id'],
        ['id_diagnostico', 'id_diagnostic'],
        ['servicio_snapshot', 'service_snapshot'],
        ['justificacion_criterio', 'criterion_justification'],
        ['fecha_generacion', 'generated_at'],
        ['id_version_configuracion', 'id_configuration_version'],
        ['id_servicio_principal', 'id_primary_service'],
        ['puntaje_principal', 'primary_score'],
        ['resultado_tipo', 'result_type'],
      ],
    ],
    [
      'irl_diagnostic',
      'alternativa_recomendacion',
      'recommendation_alternative',
      [
        ['id_alternativa', 'id'],
        ['id_recomendacion', 'id_recommendation'],
        ['id_servicio', 'id_service'],
        ['servicio_snapshot', 'service_snapshot'],
        ['posicion', 'position'],
        ['puntaje', 'score'],
      ],
    ],
    [
      'irl_diagnostic',
      'traza_capas',
      'layer_trace',
      [
        ['id_traza', 'id'],
        ['id_recomendacion', 'id_recommendation'],
        ['excluidos_capa_1', 'layer_1_excluded'],
        ['ranking_pre_excepcion', 'ranking_before_exceptions'],
        ['excepciones_activadas', 'applied_exceptions'],
        ['excepciones_descartadas', 'discarded_exceptions'],
        ['ranking_post_excepcion', 'ranking_after_exceptions'],
        ['id_version_configuracion', 'id_configuration_version'],
        ['id_snapshot_calibracion', 'id_calibration_snapshot'],
        ['id_snapshot_parametros', 'id_parameters_snapshot'],
        ['hash_hechos', 'facts_hash'],
        ['evaluado_en', 'evaluated_at'],
      ],
    ],
  ];

/**
 * `[table, oldConstraint, newConstraint]`, applied on the already-renamed
 * table. Only constraints whose predicate does not name a value literal
 * belong here: Postgres rewrites column references on a column rename,
 * but it cannot know that `'FORZAR'` is about to become `'FORCE'`. Those
 * live in the drop-and-recreate lists below.
 */
const CONSTRAINTS: readonly [string, string, string][] = [
  ['irl_catalog.portfolio_service', 'uq_servicio_nombre', 'uq_portfolio_service_name'],

  [
    'irl_catalog.calibration_snapshot',
    'uq_snapshot_calibracion_numero',
    'uq_calibration_snapshot_number',
  ],

  [
    'irl_catalog.calibration_label_value',
    'uq_valor_etiqueta',
    'uq_calibration_label_value_label',
  ],
  [
    'irl_catalog.calibration_label_value',
    'uq_valor_etiqueta_orden',
    'uq_calibration_label_value_order',
  ],
  [
    'irl_catalog.calibration_label_value',
    'ck_valor_etiqueta_rango',
    'ck_calibration_label_value_range',
  ],
  [
    'irl_catalog.calibration_label_value',
    'fk_valor_etiqueta_snapshot',
    'fk_calibration_label_value_snapshot',
  ],

  [
    'irl_catalog.parameters_snapshot',
    'uq_snapshot_parametros_numero',
    'uq_parameters_snapshot_number',
  ],
  [
    'irl_catalog.parameters_snapshot',
    'ck_snapshot_parametros_no_negativos',
    'ck_parameters_snapshot_non_negative',
  ],

  [
    'irl_catalog.configuration_version',
    'uq_version_numero',
    'uq_configuration_version_number',
  ],
  [
    'irl_catalog.configuration_version',
    'fk_version_calibracion',
    'fk_configuration_version_calibration',
  ],
  [
    'irl_catalog.configuration_version',
    'fk_version_parametros',
    'fk_configuration_version_parameters',
  ],

  [
    'irl_catalog.published_ordinal_profile',
    'uq_ficha_publicada',
    'uq_published_ordinal_profile',
  ],
  [
    'irl_catalog.published_ordinal_profile',
    'ck_ficha_niveles',
    'ck_published_ordinal_profile_levels',
  ],
  [
    'irl_catalog.published_ordinal_profile',
    'fk_ficha_publicada_version',
    'fk_published_ordinal_profile_version',
  ],
  [
    'irl_catalog.published_ordinal_profile',
    'fk_ficha_publicada_servicio',
    'fk_published_ordinal_profile_service',
  ],

  [
    'irl_catalog.published_ordinal_intensity',
    'uq_intensidad_publicada',
    'uq_published_ordinal_intensity',
  ],
  [
    'irl_catalog.published_ordinal_intensity',
    'fk_intensidad_publicada_ficha',
    'fk_published_ordinal_intensity_profile',
  ],
  [
    'irl_catalog.published_ordinal_intensity',
    'fk_intensidad_publicada_dimension',
    'fk_published_ordinal_intensity_dimension',
  ],

  [
    'irl_catalog.published_eligibility_rule',
    'fk_regla_elig_version',
    'fk_published_eligibility_rule_version',
  ],
  [
    'irl_catalog.published_eligibility_rule',
    'fk_regla_elig_servicio',
    'fk_published_eligibility_rule_service',
  ],

  [
    'irl_catalog.published_exception_rule',
    'uq_excepcion_prioridad',
    'uq_published_exception_rule_priority',
  ],
  [
    'irl_catalog.published_exception_rule',
    'uq_excepcion_codigo',
    'uq_published_exception_rule_code',
  ],
  [
    'irl_catalog.published_exception_rule',
    'fk_regla_exc_version',
    'fk_published_exception_rule_version',
  ],
  [
    'irl_catalog.published_exception_rule',
    'fk_regla_exc_servicio',
    'fk_published_exception_rule_service',
  ],

  [
    'irl_catalog.draft_ordinal_profile',
    'uq_ficha_borrador_servicio',
    'uq_draft_ordinal_profile_service',
  ],
  [
    'irl_catalog.draft_ordinal_profile',
    'ck_ficha_borrador_niveles',
    'ck_draft_ordinal_profile_levels',
  ],
  [
    'irl_catalog.draft_ordinal_profile',
    'fk_ficha_borrador_servicio',
    'fk_draft_ordinal_profile_service',
  ],

  [
    'irl_catalog.draft_ordinal_intensity',
    'uq_intensidad_borrador',
    'uq_draft_ordinal_intensity',
  ],
  [
    'irl_catalog.draft_ordinal_intensity',
    'fk_intensidad_borrador_ficha',
    'fk_draft_ordinal_intensity_profile',
  ],
  [
    'irl_catalog.draft_ordinal_intensity',
    'fk_intensidad_borrador_dimension',
    'fk_draft_ordinal_intensity_dimension',
  ],

  [
    'irl_catalog.draft_eligibility_rule',
    'fk_regla_elig_borrador_servicio',
    'fk_draft_eligibility_rule_service',
  ],

  [
    'irl_catalog.draft_exception_rule',
    'uq_excepcion_borrador_prioridad',
    'uq_draft_exception_rule_priority',
  ],
  [
    'irl_catalog.draft_exception_rule',
    'uq_excepcion_borrador_codigo',
    'uq_draft_exception_rule_code',
  ],
  [
    'irl_catalog.draft_exception_rule',
    'fk_regla_exc_borrador_servicio',
    'fk_draft_exception_rule_service',
  ],

  [
    'irl_diagnostic.portfolio_recommendation',
    'uq_recomendacion_diagnostico',
    'uq_portfolio_recommendation_diagnostic',
  ],
  [
    'irl_diagnostic.portfolio_recommendation',
    'fk_recomendacion_diagnostico',
    'fk_portfolio_recommendation_diagnostic',
  ],
  [
    'irl_diagnostic.portfolio_recommendation',
    'fk_recomendacion_version',
    'fk_portfolio_recommendation_version',
  ],
  [
    'irl_diagnostic.portfolio_recommendation',
    'fk_recomendacion_servicio_principal',
    'fk_portfolio_recommendation_primary_service',
  ],

  [
    'irl_diagnostic.recommendation_alternative',
    'uq_alternativa_posicion',
    'uq_recommendation_alternative_position',
  ],
  [
    'irl_diagnostic.recommendation_alternative',
    'ck_alternativa_posicion',
    'ck_recommendation_alternative_position',
  ],
  [
    'irl_diagnostic.recommendation_alternative',
    'fk_alternativa_recomendacion',
    'fk_recommendation_alternative_recommendation',
  ],
  [
    'irl_diagnostic.recommendation_alternative',
    'fk_alternativa_servicio',
    'fk_recommendation_alternative_service',
  ],

  ['irl_diagnostic.layer_trace', 'uq_traza_recomendacion', 'uq_layer_trace_recommendation'],
  [
    'irl_diagnostic.layer_trace',
    'fk_traza_recomendacion',
    'fk_layer_trace_recommendation',
  ],
  ['irl_diagnostic.layer_trace', 'fk_traza_version', 'fk_layer_trace_version'],
  ['irl_diagnostic.layer_trace', 'fk_traza_calibracion', 'fk_layer_trace_calibration'],
  ['irl_diagnostic.layer_trace', 'fk_traza_parametros', 'fk_layer_trace_parameters'],
];

/** `[table, column, [[oldValue, newValue], ...]]`, on renamed names. */
const VALUES: readonly [string, string, readonly [string, string][]][] = [
  [
    'irl_diagnostic.portfolio_recommendation',
    'result_type',
    [
      ['RECOMENDACION', 'RECOMMENDATION'],
      ['SIN_RECOMENDACION', 'NO_RECOMMENDATION'],
    ],
  ],
  [
    'irl_catalog.published_exception_rule',
    'action',
    [
      ['FORZAR', 'FORCE'],
      ['VETAR', 'VETO'],
      ['PROMOVER', 'PROMOTE'],
      ['DEGRADAR', 'DEMOTE'],
    ],
  ],
  [
    'irl_catalog.draft_exception_rule',
    'action',
    [
      ['FORZAR', 'FORCE'],
      ['VETAR', 'VETO'],
      ['PROMOVER', 'PROMOTE'],
      ['DEGRADAR', 'DEMOTE'],
    ],
  ],
  [
    'irl_catalog.configuration_version',
    'state',
    [
      ['VIGENTE', 'ACTIVE'],
      ['ARCHIVADA', 'ARCHIVED'],
    ],
  ],
  [
    'irl_catalog.calibration_snapshot',
    'state',
    [
      ['BORRADOR', 'DRAFT'],
      ['PUBLICADO', 'PUBLISHED'],
      ['ARCHIVADO', 'ARCHIVED'],
    ],
  ],
  [
    'irl_catalog.parameters_snapshot',
    'state',
    [
      ['BORRADOR', 'DRAFT'],
      ['PUBLICADO', 'PUBLISHED'],
      ['ARCHIVADO', 'ARCHIVED'],
    ],
  ],
  [
    'irl_catalog.calibration_label_value',
    'label',
    [
      ['principal', 'primary'],
      ['secundario', 'secondary'],
      ['no_aplica', 'not_applicable'],
    ],
  ],
  [
    'irl_catalog.published_ordinal_intensity',
    'label',
    [
      ['principal', 'primary'],
      ['secundario', 'secondary'],
      ['no_aplica', 'not_applicable'],
    ],
  ],
  [
    'irl_catalog.draft_ordinal_intensity',
    'label',
    [
      ['principal', 'primary'],
      ['secundario', 'secondary'],
      ['no_aplica', 'not_applicable'],
    ],
  ],
];

/**
 * CHECKs declared over the Spanish vocabulary. They are dropped before
 * the rows are rewritten and recreated afterwards over the new column
 * names and the new values — a rename alone would leave the old literals
 * inside the predicate and reject every row.
 *
 * `[schemaQualifiedOldTable, oldCheckName]`
 */
const VALUE_CHECKS_TO_DROP: readonly [string, string][] = [
  ['irl_diagnostic.recomendacion_portafolio', 'ck_recomendacion_resultado_tipo'],
  ['irl_diagnostic.recomendacion_portafolio', 'ck_recomendacion_coherencia'],
  ['irl_catalog.regla_excepcion_publicada', 'ck_excepcion_accion'],
  ['irl_catalog.regla_excepcion_publicada', 'ck_excepcion_posiciones'],
  ['irl_catalog.regla_excepcion_borrador', 'ck_excepcion_borrador_accion'],
  ['irl_catalog.regla_excepcion_borrador', 'ck_excepcion_borrador_posiciones'],
  ['irl_catalog.version_configuracion', 'ck_version_estado'],
  ['irl_catalog.snapshot_calibracion', 'ck_snapshot_calibracion_estado'],
  ['irl_catalog.snapshot_parametros', 'ck_snapshot_parametros_estado'],
];

/** `[schemaQualifiedNewTable, newCheckName, predicate]` */
const VALUE_CHECKS_TO_ADD: readonly [string, string, string][] = [
  [
    'irl_diagnostic.portfolio_recommendation',
    'ck_portfolio_recommendation_result_type',
    `result_type IN ('RECOMMENDATION','NO_RECOMMENDATION')`,
  ],
  [
    'irl_diagnostic.portfolio_recommendation',
    'ck_portfolio_recommendation_coherence',
    `(result_type = 'RECOMMENDATION'
        AND id_primary_service      IS NOT NULL
        AND primary_score           IS NOT NULL
        AND service_snapshot        IS NOT NULL
        AND criterion_justification IS NOT NULL)
     OR
     (result_type = 'NO_RECOMMENDATION'
        AND id_primary_service IS NULL
        AND primary_score      IS NULL
        AND service_snapshot   IS NULL)`,
  ],
  [
    'irl_catalog.published_exception_rule',
    'ck_published_exception_rule_action',
    `action IN ('FORCE','VETO','PROMOTE','DEMOTE')`,
  ],
  [
    'irl_catalog.published_exception_rule',
    'ck_published_exception_rule_positions',
    `(action IN ('PROMOTE','DEMOTE') AND positions IS NOT NULL AND positions > 0)
     OR (action IN ('FORCE','VETO') AND positions IS NULL)`,
  ],
  [
    'irl_catalog.draft_exception_rule',
    'ck_draft_exception_rule_action',
    `action IN ('FORCE','VETO','PROMOTE','DEMOTE')`,
  ],
  [
    'irl_catalog.draft_exception_rule',
    'ck_draft_exception_rule_positions',
    `(action IN ('PROMOTE','DEMOTE') AND positions IS NOT NULL AND positions > 0)
     OR (action IN ('FORCE','VETO') AND positions IS NULL)`,
  ],
  [
    'irl_catalog.configuration_version',
    'ck_configuration_version_state',
    `state IN ('ACTIVE','ARCHIVED')`,
  ],
  [
    'irl_catalog.calibration_snapshot',
    'ck_calibration_snapshot_state',
    `state IN ('DRAFT','PUBLISHED','ARCHIVED')`,
  ],
  [
    'irl_catalog.parameters_snapshot',
    'ck_parameters_snapshot_state',
    `state IN ('DRAFT','PUBLISHED','ARCHIVED')`,
  ],
];

/**
 * `[schema, oldIndex, newIndex]`. Postgres rewrites the column
 * references inside an index definition when a column is renamed, so a
 * plain index only needs its own name changed.
 */
const INDEXES: readonly [string, string, string][] = [
  [
    'irl_catalog',
    'ix_valor_etiqueta_snapshot',
    'ix_calibration_label_value_snapshot',
  ],
  [
    'irl_catalog',
    'ix_regla_elig_version',
    'ix_published_eligibility_rule_version',
  ],
  [
    'irl_catalog',
    'ix_regla_exc_version',
    'ix_published_exception_rule_version',
  ],
  [
    'irl_diagnostic',
    'ix_alternativa_recomendacion',
    'ix_recommendation_alternative_recommendation',
  ],
];

/**
 * The one index that cannot simply be renamed: it is partial, and its
 * `WHERE` embeds the literal `'VIGENTE'`. A rename would leave the old
 * literal in the predicate, so after the values change the index would
 * match no row and would silently stop enforcing "at most one active
 * version" — a guarantee that only fails when two versions are published,
 * which is exactly when nobody is looking. It is dropped and recreated.
 */
const SINGLE_ACTIVE_VERSION_OLD =
  'ux_version_unica_vigente';
const SINGLE_ACTIVE_VERSION_NEW =
  'ux_configuration_version_single_active';

/**
 * The predicate DSL is stored as `jsonb`, so translating its vocabulary
 * is a data migration too. The keys (`campo`, `valor`, `operandos`), the
 * operators and the queryable field names all appear inside the stored
 * documents; a compiled rule that still says `cuelloBotella` would fail
 * to compile against the new whitelist the first time it is read.
 *
 * The rewrite is textual over the JSON representation. The tokens are
 * distinctive and quoted, and the values that could collide with them are
 * dimension codes and numbers, so a token-level replacement is exact here
 * and reversible.
 */
const DSL_COLUMNS: readonly [string, string][] = [
  ['irl_catalog.published_eligibility_rule', 'predicate'],
  ['irl_catalog.published_eligibility_rule', 'expression_tree'],
  ['irl_catalog.published_exception_rule', 'predicate'],
  ['irl_catalog.published_exception_rule', 'expression_tree'],
  ['irl_catalog.draft_eligibility_rule', 'predicate'],
  ['irl_catalog.draft_eligibility_rule', 'expression_tree'],
  ['irl_catalog.draft_exception_rule', 'predicate'],
  ['irl_catalog.draft_exception_rule', 'expression_tree'],
];

/** `[oldToken, newToken]` — quoted so only JSON tokens are touched. */
const DSL_TOKENS: readonly [string, string][] = [
  ['"campo"', '"field"'],
  ['"valor"', '"value"'],
  ['"operandos"', '"operands"'],
  ['"op": "y"', '"op": "and"'],
  ['"op": "o"', '"op": "or"'],
  ['"op": "no"', '"op": "not"'],
  ['"op":"y"', '"op":"and"'],
  ['"op":"o"', '"op":"or"'],
  ['"op":"no"', '"op":"not"'],
  ['"contiene"', '"contains"'],
  ['"no_contiene"', '"not_contains"'],
  ['"conteo>="', '"count>="'],
  ['"conteo<="', '"count<="'],
  ['"conteo="', '"count="'],
  ['"cuelloBotella"', '"bottleneck"'],
  ['"brechas"', '"gaps"'],
  ['"desequilibriosCriticos"', '"criticalImbalances"'],
  ['"desequilibriosModerados"', '"moderateImbalances"'],
  ['"nivelPromedio"', '"averageLevel"'],
  ['"nivelPorDimension.', '"levelByDimension.'],
  ['"caracterizacion.etapa"', '"characterization.stage"'],
  ['"caracterizacion.sector"', '"characterization.sector"'],
  ['"caracterizacion.tamanoEquipo"', '"characterization.teamSize"'],
  ['"caracterizacion.vinculacionAcademica"', '"characterization.academicLinkage"'],
];

/** The predicates those CHECKs had before, for the inverse migration. */
const VALUE_CHECKS_TO_RESTORE: readonly [string, string, string][] = [
  [
    'irl_diagnostic.recomendacion_portafolio',
    'ck_recomendacion_resultado_tipo',
    `resultado_tipo IN ('RECOMENDACION','SIN_RECOMENDACION')`,
  ],
  [
    'irl_diagnostic.recomendacion_portafolio',
    'ck_recomendacion_coherencia',
    `(resultado_tipo = 'RECOMENDACION'
        AND id_servicio_principal  IS NOT NULL
        AND puntaje_principal      IS NOT NULL
        AND servicio_snapshot      IS NOT NULL
        AND justificacion_criterio IS NOT NULL)
     OR
     (resultado_tipo = 'SIN_RECOMENDACION'
        AND id_servicio_principal IS NULL
        AND puntaje_principal     IS NULL
        AND servicio_snapshot     IS NULL)`,
  ],
  [
    'irl_catalog.regla_excepcion_publicada',
    'ck_excepcion_accion',
    `accion IN ('FORZAR','VETAR','PROMOVER','DEGRADAR')`,
  ],
  [
    'irl_catalog.regla_excepcion_publicada',
    'ck_excepcion_posiciones',
    `(accion IN ('PROMOVER','DEGRADAR') AND posiciones IS NOT NULL AND posiciones > 0)
     OR (accion IN ('FORZAR','VETAR') AND posiciones IS NULL)`,
  ],
  [
    'irl_catalog.regla_excepcion_borrador',
    'ck_excepcion_borrador_accion',
    `accion IN ('FORZAR','VETAR','PROMOVER','DEGRADAR')`,
  ],
  [
    'irl_catalog.regla_excepcion_borrador',
    'ck_excepcion_borrador_posiciones',
    `(accion IN ('PROMOVER','DEGRADAR') AND posiciones IS NOT NULL AND posiciones > 0)
     OR (accion IN ('FORZAR','VETAR') AND posiciones IS NULL)`,
  ],
  [
    'irl_catalog.version_configuracion',
    'ck_version_estado',
    `estado IN ('VIGENTE','ARCHIVADA')`,
  ],
  [
    'irl_catalog.snapshot_calibracion',
    'ck_snapshot_calibracion_estado',
    `estado IN ('BORRADOR','PUBLICADO','ARCHIVADO')`,
  ],
  [
    'irl_catalog.snapshot_parametros',
    'ck_snapshot_parametros_estado',
    `estado IN ('BORRADOR','PUBLICADO','ARCHIVADO')`,
  ],
];

function caseExpression(
  column: string,
  mapping: readonly [string, string][],
): string {
  const whens = mapping
    .map(([from, to]) => `WHEN '${from}' THEN '${to}'`)
    .join(' ');
  return `${column} = CASE ${column} ${whens} ELSE ${column} END`;
}

/**
 * Builds the nested `replace()` chain that rewrites the DSL tokens inside
 * one `jsonb` column, round-tripping through `text` so the replacement is
 * done on the JSON representation and handed back to Postgres to re-parse.
 */
function rewriteDslExpression(
  column: string,
  tokens: readonly [string, string][],
): string {
  return tokens.reduce(
    (expression, [from, to]) =>
      `replace(${expression}, '${from}', '${to}')`,
    `${column}::text`,
  );
}

export class EnglishPortfolioRoutingNaming1747526400018
  implements MigrationInterface
{
  name = 'EnglishPortfolioRoutingNaming1747526400018';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, check] of VALUE_CHECKS_TO_DROP) {
      await queryRunner.query(
        `ALTER TABLE ${table} DROP CONSTRAINT ${check}`,
      );
    }

    await queryRunner.query(
      `DROP INDEX irl_catalog.${SINGLE_ACTIVE_VERSION_OLD}`,
    );

    for (const [schema, oldTable, newTable, columns] of TABLES) {
      await queryRunner.query(
        `ALTER TABLE ${schema}.${oldTable} RENAME TO ${newTable}`,
      );
      for (const [oldColumn, newColumn] of columns) {
        await queryRunner.query(
          `ALTER TABLE ${schema}.${newTable} RENAME COLUMN ${oldColumn} TO ${newColumn}`,
        );
      }
    }

    for (const [table, oldName, newName] of CONSTRAINTS) {
      await queryRunner.query(
        `ALTER TABLE ${table} RENAME CONSTRAINT ${oldName} TO ${newName}`,
      );
    }

    for (const [table, column, mapping] of VALUES) {
      await queryRunner.query(
        `UPDATE ${table} SET ${caseExpression(column, mapping)}`,
      );
    }

    for (const [table, column] of DSL_COLUMNS) {
      await queryRunner.query(
        `UPDATE ${table}
            SET ${column} = ${rewriteDslExpression(column, DSL_TOKENS)}::jsonb`,
      );
    }

    for (const [schema, oldName, newName] of INDEXES) {
      await queryRunner.query(
        `ALTER INDEX ${schema}.${oldName} RENAME TO ${newName}`,
      );
    }

    for (const [table, check, predicate] of VALUE_CHECKS_TO_ADD) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD CONSTRAINT ${check} CHECK (${predicate})`,
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX ${SINGLE_ACTIVE_VERSION_NEW}
        ON irl_catalog.configuration_version (state)
        WHERE state = 'ACTIVE'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX irl_catalog.${SINGLE_ACTIVE_VERSION_NEW}`,
    );

    for (const [schema, oldName, newName] of INDEXES) {
      await queryRunner.query(
        `ALTER INDEX ${schema}.${newName} RENAME TO ${oldName}`,
      );
    }

    for (const [table, column] of DSL_COLUMNS) {
      const inverse = DSL_TOKENS.map(
        ([from, to]) => [to, from] as [string, string],
      );
      await queryRunner.query(
        `UPDATE ${table}
            SET ${column} = ${rewriteDslExpression(column, inverse)}::jsonb`,
      );
    }

    for (const [table, check] of VALUE_CHECKS_TO_ADD) {
      await queryRunner.query(
        `ALTER TABLE ${table} DROP CONSTRAINT ${check}`,
      );
    }

    for (const [table, column, mapping] of VALUES) {
      const inverse = mapping.map(
        ([from, to]) => [to, from] as [string, string],
      );
      await queryRunner.query(
        `UPDATE ${table} SET ${caseExpression(column, inverse)}`,
      );
    }

    for (const [table, oldName, newName] of CONSTRAINTS) {
      await queryRunner.query(
        `ALTER TABLE ${table} RENAME CONSTRAINT ${newName} TO ${oldName}`,
      );
    }

    for (const [schema, oldTable, newTable, columns] of [...TABLES].reverse()) {
      for (const [oldColumn, newColumn] of columns) {
        await queryRunner.query(
          `ALTER TABLE ${schema}.${newTable} RENAME COLUMN ${newColumn} TO ${oldColumn}`,
        );
      }
      await queryRunner.query(
        `ALTER TABLE ${schema}.${newTable} RENAME TO ${oldTable}`,
      );
    }

    for (const [table, check, predicate] of VALUE_CHECKS_TO_RESTORE) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD CONSTRAINT ${check} CHECK (${predicate})`,
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX ${SINGLE_ACTIVE_VERSION_OLD}
        ON irl_catalog.version_configuracion (estado)
        WHERE estado = 'VIGENTE'
    `);
  }
}
