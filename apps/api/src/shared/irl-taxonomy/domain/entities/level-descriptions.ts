import type { DimensionCode } from '@innlab/contracts';

/**
 * What each IRL level means for one framework version: one sentence per
 * dimension and level, and one per global level. A level without its text
 * (a version seeded without them) simply has none: the score is still
 * shown, without its explanation.
 */
export class LevelDescriptions {
  private constructor(
    private readonly byDimension: ReadonlyMap<
      DimensionCode,
      ReadonlyMap<number, string>
    >,
    private readonly global: ReadonlyMap<number, string>,
  ) {}

  static create(
    byDimension: ReadonlyMap<DimensionCode, ReadonlyMap<number, string>>,
    global: ReadonlyMap<number, string>,
  ): LevelDescriptions {
    return new LevelDescriptions(byDimension, global);
  }

  static empty(): LevelDescriptions {
    return new LevelDescriptions(new Map(), new Map());
  }

  forDimension(code: DimensionCode, level: number): string | null {
    return this.byDimension.get(code)?.get(level) ?? null;
  }

  forGlobal(level: number): string | null {
    return this.global.get(level) ?? null;
  }

  /** The nine texts of a dimension, level 1 first; `null` where one is missing. */
  scaleOf(code: DimensionCode): (string | null)[] {
    return Array.from({ length: 9 }, (_, i) => this.forDimension(code, i + 1));
  }
}
