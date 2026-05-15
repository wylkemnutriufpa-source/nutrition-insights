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
    allowed_groups: [
      'proteina-almoco', 
      'carbo-almoco', 
      'carbo-tuberoso', 
      'cafe-proteico',
      'cafe-classico'
    ],
    forbidden_groups: ['ceia-leve', 'laticinio-leve'],
    forbidden_keywords: [
      'light', 'diet', 'apenas fruta', 'gelatina', 
      'biscoito de arroz', 'chá'
    ],
    substitution_policy: 'strict',
    repetition_policy: {
      max_weekly_repeats: 5,
      protein_diversity_required: true
    }
  },
  low_carb: {
    meal_density_profile: 'medium',
    forbidden_groups: ['carbo-almoco', 'carbo-cereal'],
    forbidden_keywords: [
      'arroz', 'macarrão', 'pão branco', 'tapioca', 
      'cuscuz', 'batata inglesa', 'suco de fruta'
    ],
    allowed_groups: [
      'proteina-almoco', 
      'proteina-peixe', 
      'proteina-leve', 
      'salada-base', 
      'gordura-oleaginosa',
      'laticinio-proteico'
    ],
    substitution_policy: 'strict'
  },
  emagrecimento: {
    meal_density_profile: 'low',
    forbidden_groups: ['gordura-oleaginosa'],
    forbidden_keywords: ['açúcar', 'fritura', 'doce', 'refrigerante', 'farinha branca'],
    allowed_groups: ['proteina-leve', 'salada-base', 'fruta-acida', 'carbo-tuberoso'],
    substitution_policy: 'clinical_only'
  },
  performance: {
    meal_density_profile: 'high',
    allowed_groups: [
      'carbo-cereal', 
      'carbo-tuberoso', 
      'proteina-almoco',
      'proteina-peixe'
    ],
    substitution_policy: 'loose'
  },
  saude_geral: {
    meal_density_profile: 'medium',
    substitution_policy: 'loose'
  },
  cetogenica: {
    meal_density_profile: 'high',
    substitution_policy: 'strict'
  },
  mediterranea: {
    meal_density_profile: 'medium',
    substitution_policy: 'loose'
  },
  anti_inflamatoria: {
    meal_density_profile: 'medium',
    substitution_policy: 'strict'
  }
};


/**
 * Contratos Específicos por Slot (Identidade de Refeição)
 * Adicional aos contratos de família.
 */
export const SLOT_STYLE_CONTRACTS: Record<string, TemplateStyleContract> = {
  breakfast: {
    allowed_groups: [
      'cafe-classico', 
      'cafe-proteico', 
      'fruta-doce', 
      'laticinio-proteico',
      'carbo-cereal'
    ],
    forbidden_keywords: [
      'arroz', 'feijão', 'peixe', 'carne moída', 
      'bife', 'tilápia', 'salmão', 'frango grelhado'
    ]
  }
};

/**
 * Obtém o contrato de estilo com base na família ou slug.
 */
export function getStyleContract(family?: string, slot?: string): TemplateStyleContract {
  const familyContract = family ? (TEMPLATE_STYLE_REGISTRY[family as TemplateFamily] || {}) : {};
  
  if (slot && SLOT_STYLE_CONTRACTS[slot]) {
    const slotContract = SLOT_STYLE_CONTRACTS[slot];
    // Mescla os contratos dando prioridade ao slot para proibições
    return {
      ...familyContract,
      forbidden_keywords: [
        ...(familyContract.forbidden_keywords || []),
        ...(slotContract.forbidden_keywords || [])
      ],
      forbidden_groups: [
        ...(familyContract.forbidden_groups || []),
        ...(slotContract.forbidden_groups || [])
      ],
      allowed_groups: slotContract.allowed_groups || familyContract.allowed_groups
    };
  }

  return familyContract;
}
