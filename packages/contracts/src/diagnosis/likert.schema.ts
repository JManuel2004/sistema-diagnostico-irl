import { z } from 'zod';

export const likertValueSchema = z.number().int().min(1).max(5).describe('Likert value, 1 to 5');

export type LikertValue = z.infer<typeof likertValueSchema>;
