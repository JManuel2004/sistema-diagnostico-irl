import {
  validateCompleteness,
  DIMENSIONS,
  QUESTION_KEYS,
  QUESTIONS_PER_DIMENSION,
  TOTAL_QUESTIONS,
  type PartialQuestionnaire,
  type Dimension,
} from '../../../../src/modules/questionnaire/domain/questionnaire-validator.js';

function buildFullDimension(): Record<string, number> {
  return Object.fromEntries(QUESTION_KEYS.map((q) => [q, 3]));
}

function buildFullAnswers(): PartialQuestionnaire {
  return Object.fromEntries(DIMENSIONS.map((d) => [d, buildFullDimension()])) as PartialQuestionnaire;
}

describe('validateCompleteness', () => {
  describe('con cuestionario vacío', () => {
    const result = validateCompleteness({});

    it('reporta 0 respuestas', () => {
      expect(result.answeredCount).toBe(0);
    });

    it('marca las 6 dimensiones como incompletas', () => {
      expect(result.incompleteDimensions).toHaveLength(DIMENSIONS.length);
      expect(result.incompleteDimensions).toEqual(expect.arrayContaining([...DIMENSIONS]));
    });

    it('isComplete es false', () => {
      expect(result.isComplete).toBe(false);
    });

    it('totalCount es siempre 48', () => {
      expect(result.totalCount).toBe(TOTAL_QUESTIONS);
    });
  });

  describe('con las 48 respuestas completas', () => {
    const result = validateCompleteness(buildFullAnswers());

    it('reporta 48 respuestas', () => {
      expect(result.answeredCount).toBe(TOTAL_QUESTIONS);
    });

    it('no reporta dimensiones incompletas', () => {
      expect(result.incompleteDimensions).toHaveLength(0);
    });

    it('isComplete es true', () => {
      expect(result.isComplete).toBe(true);
    });
  });

  describe('con solo una dimensión completa', () => {
    const result = validateCompleteness({ trl: buildFullDimension() });

    it('reporta 8 respuestas', () => {
      expect(result.answeredCount).toBe(QUESTIONS_PER_DIMENSION);
    });

    it('marca las otras 5 dimensiones como incompletas', () => {
      expect(result.incompleteDimensions).toHaveLength(5);
      expect(result.incompleteDimensions).not.toContain('trl' satisfies Dimension);
    });

    it('isComplete es false', () => {
      expect(result.isComplete).toBe(false);
    });
  });

  describe('con una sola respuesta faltante', () => {
    const answers: PartialQuestionnaire = {
      ...buildFullAnswers(),
      trl: { q2: 3, q3: 3, q4: 3, q5: 3, q6: 3, q7: 3, q8: 3 },
    };
    const result = validateCompleteness(answers);

    it('reporta 47 respuestas', () => {
      expect(result.answeredCount).toBe(TOTAL_QUESTIONS - 1);
    });

    it('solo marca trl como incompleta', () => {
      expect(result.incompleteDimensions).toEqual(['trl']);
    });

    it('isComplete es false', () => {
      expect(result.isComplete).toBe(false);
    });
  });

  describe('con dimensión parcialmente respondida', () => {
    it('cuenta solo las respuestas presentes', () => {
      const result = validateCompleteness({ trl: { q1: 1, q3: 5 } });
      expect(result.answeredCount).toBe(2);
      expect(result.incompleteDimensions).toContain('trl' satisfies Dimension);
    });
  });

  describe('con todos los valores Likert válidos (1–5)', () => {
    it('acepta los 5 valores como respondidos', () => {
      const result = validateCompleteness({
        trl: { q1: 1, q2: 2, q3: 3, q4: 4, q5: 5, q6: 1, q7: 2, q8: 3 },
      });
      expect(result.answeredCount).toBe(8);
      expect(result.incompleteDimensions).not.toContain('trl' satisfies Dimension);
    });
  });

  describe('totalCount', () => {
    it('siempre es 48 independientemente del input', () => {
      expect(validateCompleteness({}).totalCount).toBe(48);
      expect(validateCompleteness(buildFullAnswers()).totalCount).toBe(48);
    });
  });

  describe('con múltiples dimensiones parciales', () => {
    it('reporta todas las dimensiones incompletas correctamente', () => {
      const answers: PartialQuestionnaire = {
        trl: { q1: 2 },
        crl: { q1: 3, q2: 4 },
        brl: buildFullDimension(),
      };
      const result = validateCompleteness(answers);
      expect(result.answeredCount).toBe(1 + 2 + 8);
      expect(result.incompleteDimensions).toEqual(
        expect.arrayContaining(['trl', 'crl', 'iprl', 'tmrl', 'frl'] satisfies Dimension[]),
      );
      expect(result.incompleteDimensions).not.toContain('brl' satisfies Dimension);
    });
  });
});
