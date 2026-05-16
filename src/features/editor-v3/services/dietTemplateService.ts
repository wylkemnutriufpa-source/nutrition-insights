
import { supabase } from "@/integrations/supabase/client";
import { V3DietTemplate, KcalProfile, Meal } from "../types/types";

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
    title: 'Hipertrofia 2500 kcal',
    description: 'Foco em ganho de massa muscular com estrutura fisiológica e alimentos reais.',
    template_type: 'visual_v3',
    objective: 'hipertrofia',
    family: 'hipertrofia',
    meal_distribution: [
      { slot: 'cafe_da_manha', time: '07:00' },
      { slot: 'almoco', time: '13:00' },
      { slot: 'lanche_da_tarde', time: '16:00' },
      { slot: 'jantar', time: '20:00' }
    ],
    cluster_map: {
      'cafe_da_manha': 'cafe_tradicional',
      'almoco': 'almoco_tradicional',
      'lanche_da_tarde': 'lanche_proteico',
      'jantar': 'jantar_leve'
    },
    kcal_profiles: [2500],
    visual_style: 'clean',
    substitutions_enabled: true,
    editable: true,
    active: true,
    plan_snapshot: {
      "2500": {
        meals: [
          {
            id: 'm1',
            name: 'Café da Manhã',
            time: '07:00',
            day_of_week: 1,
            items: [
              {
                id: 'i1',
                instanceId: 'i1-1',
                name: 'Pão Integral',
                quantity: 2,
                clinical_mass_g: 50,
                kcal: 140,
                protein: 6,
                carbs: 25,
                fat: 2,
                substitutions: [],
                portionValue: 1,
                portionUnitLabel: 'fatia',
                measurementType: 'unit'
              },
              {
                id: 'i2',
                instanceId: 'i2-1',
                name: 'Ovo Mexido',
                quantity: 3,
                clinical_mass_g: 150,
                kcal: 210,
                protein: 18,
                carbs: 2,
                fat: 15,
                substitutions: [],
                portionValue: 1,
                portionUnitLabel: 'unid',
                measurementType: 'unit'
              }
            ]
          },
          {
            id: 'm2',
            name: 'Almoço',
            time: '13:00',
            day_of_week: 1,
            items: [
              {
                id: 'i3',
                instanceId: 'i3-1',
                name: 'Arroz Branco',
                quantity: 120,
                clinical_mass_g: 120,
                kcal: 156,
                protein: 3,
                carbs: 34,
                fat: 0.3,
                substitutions: [
                  { id: 'sub1', name: 'Macarrão Integral', kcal: 156, protein: 5, carbs: 30, fat: 1, quantity: 100, clinical_mass_g: 100 }
                ],
                portionValue: 100,
                portionUnitLabel: 'g',
                measurementType: 'gram'
              },
              {
                id: 'i4',
                instanceId: 'i4-1',
                name: 'Feijão Carioca',
                quantity: 100,
                clinical_mass_g: 100,
                kcal: 76,
                protein: 5,
                carbs: 14,
                fat: 0.5,
                substitutions: [],
                portionValue: 100,
                portionUnitLabel: 'g',
                measurementType: 'gram'
              },
              {
                id: 'i5',
                instanceId: 'i5-1',
                name: 'Frango Grelhado',
                quantity: 150,
                clinical_mass_g: 150,
                kcal: 240,
                protein: 45,
                carbs: 0,
                fat: 6,
                substitutions: [
                  { id: 'sub2', name: 'Patinho Moído', kcal: 240, protein: 42, carbs: 0, fat: 8, quantity: 150, clinical_mass_g: 150 },
                  { id: 'sub3', name: 'Tilápia Grelhada', kcal: 240, protein: 48, carbs: 0, fat: 4, quantity: 180, clinical_mass_g: 180 }
                ],
                portionValue: 100,
                portionUnitLabel: 'g',
                measurementType: 'gram'
              },
              {
                id: 'i6',
                instanceId: 'i6-1',
                name: 'Salada Variada',
                quantity: 80,
                clinical_mass_g: 80,
                kcal: 25,
                protein: 1,
                carbs: 4,
                fat: 0,
                substitutions: [],
                portionValue: 100,
                portionUnitLabel: 'g',
                measurementType: 'gram'
              }
            ]
          }
        ]
      }
    }
  },
  {
    id: 't2',
    slug: 'emagrecimento',
    title: 'Emagrecimento 1600 kcal',
    description: 'Déficit calórico controlado com alta saciedade e alimentos nutritivos.',
    template_type: 'visual_v3',
    objective: 'emagrecimento',
    family: 'emagrecimento',
    meal_distribution: [
      { slot: 'cafe_da_manha', time: '08:00' },
      { slot: 'almoco', time: '13:00' },
      { slot: 'lanche_da_tarde', time: '17:00' },
      { slot: 'jantar', time: '20:00' }
    ],
    cluster_map: {
      'cafe_da_manha': 'cafe_saudavel',
      'almoco': 'almoco_tradicional',
      'lanche_da_tarde': 'lanche_fruta',
      'jantar': 'jantar_leve'
    },
    kcal_profiles: [1600],
    visual_style: 'clean',
    substitutions_enabled: true,
    editable: true,
    active: true,
    plan_snapshot: {
      "1600": {
        meals: [
          {
            id: 'm3',
            name: 'Café da Manhã',
            time: '08:00',
            day_of_week: 1,
            items: [
              {
                id: 'i7',
                instanceId: 'i7-1',
                name: 'Iogurte Natural',
                quantity: 170,
                clinical_mass_g: 170,
                kcal: 110,
                protein: 7,
                carbs: 10,
                fat: 4.5,
                substitutions: [],
                portionValue: 1,
                portionUnitLabel: 'pote',
                measurementType: 'unit'
              },
              {
                id: 'i8',
                instanceId: 'i8-1',
                name: 'Morango',
                quantity: 100,
                clinical_mass_g: 100,
                kcal: 32,
                protein: 0.7,
                carbs: 7.7,
                fat: 0.3,
                substitutions: [],
                portionValue: 100,
                portionUnitLabel: 'g',
                measurementType: 'gram'
              }
            ]
          }
        ]
      }
    }
  }
];

export class DietTemplateService {
  static async listTemplates(): Promise<V3DietTemplate[]> {
    const { data, error } = await supabase
      .from('v3_diet_templates')
      .select('*')
      .eq('active', true)
      .order('title');

    if (error || !data || data.length === 0) {
      return MOCK_TEMPLATES;
    }

    return (data as unknown) as V3DietTemplate[];
  }

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
