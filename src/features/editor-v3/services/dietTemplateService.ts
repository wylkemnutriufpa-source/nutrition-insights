

import { supabase } from "@/integrations/supabase/client";
import { V3DietTemplate, KcalProfile } from "../types/types";
import { getStyleContract } from "@/lib/templateStyles";

const KCAL_PROFILES: KcalProfile[] = [
  { kcal: 1200, meal_intensity: 'low', satiety_level: 4, protein_density: 'standard' },
  { kcal: 1400, meal_intensity: 'low', satiety_level: 5, protein_density: 'standard' },
  { kcal: 1600, meal_intensity: 'medium', satiety_level: 6, protein_density: 'high' },
  { kcal: 1800, meal_intensity: 'medium', satiety_level: 7, protein_density: 'high' },
  { kcal: 2200, meal_intensity: 'high', satiety_level: 8, protein_density: 'ultra' },
  { kcal: 2800, meal_intensity: 'high', satiety_level: 9, protein_density: 'ultra' }
];

const MOCK_TEMPLATES: V3DietTemplate[] = [
  {
    id: 't1',
    slug: 'hipertrofia_tradicional',
    title: 'Hipertrofia Tradicional',
    description: 'Foco em ganho de massa com alimentos brasileiros clássicos.',
    template_type: 'visual_v3',
    objective: 'hipertrofia',
    family: 'hipertrofia',
    meal_distribution: [
      { slot: 'cafe_da_manha', time: '08:00' },
      { slot: 'almoço', time: '12:30' },
      { slot: 'lanche_da_tarde', time: '16:00' },
      { slot: 'jantar', time: '19:30' }
    ],
    cluster_map: {
      'cafe_da_manha': 'cafe_tradicional',
      'almoço': 'almoco_tradicional',
      'lanche_da_tarde': 'lanche_proteico',
      'jantar': 'jantar_leve'
    },
    kcal_profiles: KCAL_PROFILES,
    visual_style: 'clean',
    substitutions_enabled: true,
    editable: true,
    active: true,
    meal_integrity_threshold: 1.6
  },
  {
    id: 't2',
    slug: 'emagrecimento_lowcarb',
    title: 'Emagrecimento Low Carb',
    description: 'Estratégia de redução de carboidratos para queima de gordura.',
    template_type: 'visual_v3',
    objective: 'emagrecimento',
    family: 'emagrecimento',
    meal_distribution: [
      { slot: 'cafe_da_manha', time: '08:30' },
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
    kcal_profiles: KCAL_PROFILES.slice(0, 4), // 1200-1800
    visual_style: 'premium',
    substitutions_enabled: true,
    editable: true,
    active: true,
    meal_integrity_threshold: 1.4
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
