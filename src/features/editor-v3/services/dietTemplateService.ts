
import { supabase } from "@/integrations/supabase/client";
import { V3DietTemplate, KcalProfile, Meal, MealItem } from "../types/types";

const BASE_IMAGE_URL = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/';

const IMAGE_MAP: Record<string, string> = {
  'Pão Integral': 'pao-integral.jpg',
  'Ovo Mexido': 'ovos-mexidos.jpg',
  'Arroz Branco': 'arroz-branco.jpg',
  'Feijão Carioca': 'feijao-carioca.jpg',
  'Frango Grelhado': 'frango-grelhado.jpg',
  'Iogurte com Frutas': 'iogurte-com-fruta/iogurte-com-fruta.jpg',
  'Sopa de Legumes': 'sopa-de-legumes.jpg',
  'Banana com Aveia': 'banana-com-aveia.jpg',
  'Whey Protein': 'whey-protein.jpg',
  'Carne Grelhada': 'carne-grelhada.jpg'
};

const createMeal = (name: string, time: string, day: number, items: any[]): Meal => ({
  id: `m-${name}-${day}`,
  name,
  time,
  day_of_week: day,
  items: items.map(it => ({
    ...it,
    instanceId: `inst-${it.id}-${day}`,
    imageUrl: it.imageUrl || (IMAGE_MAP[it.name] ? `${BASE_IMAGE_URL}${IMAGE_MAP[it.name]}` : `${BASE_IMAGE_URL}fruta.jpg`),
    substitutions: it.substitutions || []
  })) as MealItem[]
});

const MOCK_TEMPLATES: V3DietTemplate[] = [
  {
    id: 't1',
    slug: 'mediterranea-pro',
    title: 'Mediterrânea Anti-inflamatória PRO',
    description: 'Plano completo de 7 dias com foco em alimentos anti-inflamatórios e gorduras boas.',
    template_type: 'visual_v3',
    objective: 'saude',
    meal_distribution: [
      { slot: 'Café da Manhã', time: '08:00' },
      { slot: 'Almoço', time: '13:00' },
      { slot: 'Lanche da Tarde', time: '16:00' },
      { slot: 'Jantar', time: '20:00' }
    ],
    cluster_map: {},
    kcal_profiles: [2000],
    visual_style: 'clean',
    substitutions_enabled: true,
    editable: true,
    active: true,
    plan_snapshot: {
      "2000": {
        meals: [1, 2, 3, 4, 5, 6, 0].flatMap(d => [
          createMeal('Café da Manhã', '08:00', d, [
            { id: 'i-pao', name: 'Pão Integral', kcal: 140, protein: 6, carbs: 25, fat: 2, clinical_mass_g: 50 },
            { id: 'i-ovo', name: 'Ovo Mexido', kcal: 140, protein: 12, carbs: 1, fat: 10, clinical_mass_g: 100 }
          ]),
          createMeal('Almoço', '13:00', d, [
            { id: 'i-arroz', name: 'Arroz Branco', kcal: 156, protein: 3, carbs: 34, fat: 0, clinical_mass_g: 120 },
            { id: 'i-feijao', name: 'Feijão Carioca', kcal: 76, protein: 5, carbs: 14, fat: 0, clinical_mass_g: 100 },
            { id: 'i-frango', name: 'Frango Grelhado', kcal: 240, protein: 45, carbs: 0, fat: 6, clinical_mass_g: 150 }
          ]),
          createMeal('Lanche da Tarde', '16:00', d, [
            { id: 'i-iogurte', name: 'Iogurte com Frutas', kcal: 180, protein: 12, carbs: 25, fat: 4, clinical_mass_g: 200 }
          ]),
          createMeal('Jantar', '20:00', d, [
            { id: 'i-sopa', name: 'Sopa de Legumes', kcal: 250, protein: 25, carbs: 15, fat: 8, clinical_mass_g: 350 }
          ])
        ])
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
