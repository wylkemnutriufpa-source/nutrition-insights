import { TemplateStyleContract, TemplateFamily } from "@/features/editor-v3/types";

/**
 * FitJourney — Template Style Registry
 * ----------------------------------------------------------------
 * Define os contratos de identidade clínica para cada família de template.
 * O contrato governa o que o resolver pode ou não fazer.
 */

export const TEMPLATE_STYLE_REGISTRY: Record<TemplateFamily, TemplateStyleContract> = {
  hipertrofia: {
    meal_density_profile: 'high',
    allowed_groups: ['proteina-almoco', 'carbo-almoco', 'carbo-tuberoso', 'cafe-proteico'],
    forbidden_groups: ['ceia-leve'],
    forbidden_keywords: ['light', 'diet', 'apenas fruta'],
    substitution_policy: 'strict',
    repetition_policy: {
      max_weekly_repeats: 5,
      protein_diversity_required: true
    }
  },
  low_carb: {
    meal_density_profile: 'medium',
    forbidden_groups: ['carbo-almoco', 'carbo-cereal'],
    forbidden_keywords: ['arroz', 'macarrão', 'pão branco', 'tapioca'],
    allowed_groups: ['proteina-almoco', 'proteina-peixe', 'proteina-leve', 'salada-base', 'gordura-oleaginosa'],
    substitution_policy: 'strict'
  },
  emagrecimento: {
    meal_density_profile: 'low',
    forbidden_groups: ['gordura-oleaginosa'],
    forbidden_keywords: ['açúcar', 'fritura'],
    substitution_policy: 'clinical_only'
  },
  performance: {
    meal_density_profile: 'high',
    allowed_groups: ['carbo-cereal', 'carbo-tuberoso', 'proteina-almoco'],
    substitution_policy: 'loose'
  },
  saude_geral: {
    meal_density_profile: 'medium',
    substitution_policy: 'loose'
  }
};

/**
 * Obtém o contrato de estilo com base na família ou slug.
 */
export function getStyleContract(family?: string): TemplateStyleContract | null {
  if (!family) return null;
  return TEMPLATE_STYLE_REGISTRY[family as TemplateFamily] || null;
}
