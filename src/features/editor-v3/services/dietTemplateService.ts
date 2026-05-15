

import { supabase } from "@/integrations/supabase/client";
import { V3DietTemplate, KcalProfile } from "../types/types";
import { getStyleContract } from "@/lib/templateStyles";

const KCAL_PROFILES: KcalProfile[] = [
  { kcal: 1200, meal_intensity: 'low' },
  { kcal: 1400, meal_intensity: 'low' },
  { kcal: 1600, meal_intensity: 'medium' },
  { kcal: 1800, meal_intensity: 'medium' },
  { kcal: 2200, meal_intensity: 'high' }
];


const MOCK_TEMPLATES: V3DietTemplate[] = [
  {
    id: 't1',
    slug: 'hipertrofia',
    title: 'Hipertrofia',
    description: 'Foco em ganho de massa muscular com estrutura fisiológica e alimentos reais.',
    template_type: 'visual_v3',
    objective: 'hipertrofia',
    family: 'hipertrofia',
    meal_distribution: [
      { slot: 'cafe_da_manha', time: '07:00' },
      { slot: 'lanche_da_manha', time: '10:00' },
      { slot: 'almoço', time: '13:00' },
      { slot: 'lanche_da_tarde', time: '16:00' },
      { slot: 'jantar', time: '20:00' },
      { slot: 'ceia', time: '22:30' }
    ],
    cluster_map: {
      'cafe_da_manha': 'cafe_tradicional',
      'lanche_da_manha': 'lanche_pratico',
      'almoço': 'almoco_tradicional',
      'lanche_da_tarde': 'lanche_proteico',
      'jantar': 'jantar_leve',
      'ceia': 'lanche_leve'
    },
    kcal_profiles: KCAL_PROFILES,
    visual_style: 'clean',
    substitutions_enabled: true,
    editable: true,
    active: true
  },
  {
    id: 't2',
    slug: 'emagrecimento',
    title: 'Emagrecimento',
    description: 'Déficit calórico controlado com alta saciedade e alimentos nutritivos.',
    template_type: 'visual_v3',
    objective: 'emagrecimento',
    family: 'emagrecimento',
    meal_distribution: [
      { slot: 'cafe_da_manha', time: '08:00' },
      { slot: 'almoço', time: '13:00' },
      { slot: 'lanche_da_tarde', time: '17:00' },
      { slot: 'jantar', time: '20:00' }
    ],
    cluster_map: {
      'cafe_da_manha': 'cafe_saudavel',
      'almoço': 'almoco_tradicional',
      'lanche_da_tarde': 'lanche_fruta',
      'jantar': 'jantar_leve'
    },
    kcal_profiles: KCAL_PROFILES,
    visual_style: 'clean',
    substitutions_enabled: true,
    editable: true,
    active: true
  },
  {
    id: 't3',
    slug: 'low_carb',
    title: 'Low Carb',
    description: 'Redução de carboidratos com foco em proteínas e gorduras boas.',
    template_type: 'visual_v3',
    objective: 'saude',
    family: 'low_carb',
    meal_distribution: [
      { slot: 'cafe_da_manha', time: '08:00' },
      { slot: 'almoço', time: '13:00' },
      { slot: 'lanche_da_tarde', time: '17:00' },
      { slot: 'jantar', time: '20:00' }
    ],
    cluster_map: {
      'cafe_da_manha': 'cafe_lowcarb',
      'almoço': 'almoco_lowcarb',
      'lanche_da_tarde': 'lanche_lowcarb',
      'jantar': 'jantar_lowcarb'
    },
    kcal_profiles: KCAL_PROFILES,
    visual_style: 'clean',
    substitutions_enabled: true,
    editable: true,
    active: true
  },
  {
    id: 't4',
    slug: 'cetogenica',
    title: 'Cetogênica',
    description: 'Dieta de altíssima gordura e baixo carboidrato para cetose.',
    template_type: 'visual_v3',
    objective: 'saude',
    family: 'cetogenica',
    meal_distribution: [
      { slot: 'cafe_da_manha', time: '08:00' },
      { slot: 'almoço', time: '13:00' },
      { slot: 'jantar', time: '20:00' }
    ],
    cluster_map: {
      'cafe_da_manha': 'cafe_keto',
      'almoço': 'almoco_keto',
      'jantar': 'jantar_keto'
    },
    kcal_profiles: KCAL_PROFILES,
    visual_style: 'clean',
    substitutions_enabled: true,
    editable: true,
    active: true
  },
  {
    id: 't5',
    slug: 'mediterranea',
    title: 'Mediterrânea',
    description: 'Foco em gorduras saudáveis, vegetais e peixes.',
    template_type: 'visual_v3',
    objective: 'saude',
    family: 'mediterranea',
    meal_distribution: [
      { slot: 'cafe_da_manha', time: '08:00' },
      { slot: 'almoço', time: '13:00' },
      { slot: 'lanche_da_tarde', time: '17:00' },
      { slot: 'jantar', time: '20:00' }
    ],
    cluster_map: {
      'cafe_da_manha': 'cafe_mediterraneo',
      'almoço': 'almoco_mediterraneo',
      'lanche_da_tarde': 'lanche_mediterraneo',
      'jantar': 'jantar_mediterraneo'
    },
    kcal_profiles: KCAL_PROFILES,
    visual_style: 'clean',
    substitutions_enabled: true,
    editable: true,
    active: true
  },
  {
    id: 't6',
    slug: 'anti_inflamatoria',
    title: 'Anti-inflamatória',
    description: 'Estrutura alimentar focada em reduzir inflamação sistêmica.',
    template_type: 'visual_v3',
    objective: 'saude',
    family: 'anti_inflamatoria',
    meal_distribution: [
      { slot: 'cafe_da_manha', time: '08:00' },
      { slot: 'almoço', time: '13:00' },
      { slot: 'lanche_da_tarde', time: '17:00' },
      { slot: 'jantar', time: '20:00' }
    ],
    cluster_map: {
      'cafe_da_manha': 'cafe_saudavel',
      'almoço': 'almoco_saudavel',
      'lanche_da_tarde': 'lanche_saudavel',
      'jantar': 'jantar_leve'
    },
    kcal_profiles: KCAL_PROFILES,
    visual_style: 'clean',
    substitutions_enabled: true,
    editable: true,
    active: true
  }
];


export class DietTemplateService {
  /**
   * Lista todos os templates V3 ativos
   */
  static async listTemplates(): Promise<V3DietTemplate[]> {
    const { data, error } = await supabase
      .from('v3_diet_templates')
      .select('*')
      .eq('active', true)
      .order('title');

    if (error || !data || data.length === 0) {
      console.info('[DietTemplateService] Using Mock Templates for Sandbox.');
      return MOCK_TEMPLATES;
    }

    return (data as unknown) as V3DietTemplate[];
  }

  /**
   * Busca um template por slug
   */
  static async getTemplateBySlug(slug: string): Promise<V3DietTemplate | null> {
    const { data, error } = await supabase
      .from('v3_diet_templates')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return MOCK_TEMPLATES.find(t => t.slug === slug) || null;
    }

    return (data as unknown) as V3DietTemplate;
  }

  /**
   * Busca templates por objetivo
   */
  static async getTemplatesByObjective(objective: string): Promise<V3DietTemplate[]> {
    const { data, error } = await supabase
      .from('v3_diet_templates')
      .select('*')
      .eq('objective', objective)
      .eq('active', true);

    if (error || !data || data.length === 0) {
      return MOCK_TEMPLATES.filter(t => t.objective === objective);
    }

    return (data as unknown) as V3DietTemplate[];
  }
}
