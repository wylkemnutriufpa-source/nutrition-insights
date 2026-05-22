/**
 * 🛡️ SOVEREIGN CONSTITUTION - THE ARCHITECTURAL LAW
 * 
 * RULE 1: THE FRONTEND NEVER THINKS.
 * The snapshot must be born "thinking". All macros, images, quantities, 
 * and clinical decisions must be persisted in the snapshot.
 * 
 * RULE 2: PASSIVE RENDERING ONLY.
 * Components must render raw snapshot data. No runtime hydration, 
 * no "smart" fallbacks, no inferred quantities.
 * 
 * RULE 3: TEMPORAL ISOLATION.
 * Clinical protocols must NOT depend on the user's local clock (new Date()).
 * The day shown is determined by the selected protocol day, not the current weekday.
 * 
 * RULE 4: IMMUTABLE SCHEMA.
 * Snapshot V3 is final. Any structural change requires a version bump (V4).
 * 
 * RULE 5: ZERO FALLBACK TOLERANCE.
 * If data is missing in the snapshot, the system must fail visibly (or block publishing)
 * rather than guessing a default.
 */

import { MealPlanSnapshotV3Schema, type MealPlanSnapshotV3 } from './schemas';
import { z } from 'zod';

// Strict Sovereign Schema for validation before publishing
export const SovereignSnapshotSchema = MealPlanSnapshotV3Schema.extend({
  days: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    meals: z.array(z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      time: z.string(),
      items: z.array(z.object({
        title: z.string().min(1),
        quantity_display: z.string().min(1),
        macros: z.object({
          kcal: z.number().positive(),
          protein_g: z.number().min(0),
          carbs_g: z.number().min(0),
          fat_g: z.number().min(0),
        }),
        visual: z.object({
          image_url: z.string().url("Imagem da refeição é obrigatória para soberania"),
        }),
      })).min(1, "Cada refeição deve ter pelo menos um item"),
    })).min(1, "Cada dia deve ter pelo menos uma refeição"),
  })).min(1, "O plano deve ter pelo menos um dia"),
});

export type SovereignSnapshot = z.infer<typeof SovereignSnapshotSchema>;

export function validateSovereignSnapshot(snapshot: unknown): { success: boolean; errors?: string[] } {
  const result = SovereignSnapshotSchema.safeParse(snapshot);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map(err => `${err.path.join('.')}: ${err.message}`),
    };
  }
  return { success: true };
}
