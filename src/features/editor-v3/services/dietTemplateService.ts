
import { supabase } from "@/integrations/supabase/client";
import { V3DietTemplate, KcalProfile, Meal, MealItem } from "../types/types";

// Helper to generate a complete meal for the mock
const createMeal = (name: string, time: string, day: number, items: any[]): Meal => ({
  id: `m-${name}-${day}`,
  name,
  time,
  day_of_week: day,
  items: items.map(it => ({
    ...it,
    instanceId: `inst-${it.id}-${day}`,
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
    family: 'mediterranea',
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
            {
              id: 'i-pao',
              name: 'Pão Integral',
              title: 'Pão Integral com Ovo',
              quantity: 2,
              display_quantity: '2 fatias',
              display_unit: 'fatias',
              clinical_mass_g: 50,
              kcal: 140,
              protein: 6,
              carbs: 25,
              fat: 2,
              imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-integral.jpg'
            },
            {
              id: 'i-ovo',
              name: 'Ovo Mexido',
              title: 'Ovo Mexido',
              quantity: 2,
              display_quantity: '2 unidades',
              display_unit: 'unid',
              clinical_mass_g: 100,
              kcal: 140,
              protein: 12,
              carbs: 1,
              fat: 10,
              imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovo-mexido.jpg'
            }
          ]),
          createMeal('Almoço', '13:00', d, [
            {
              id: 'i-arroz',
              name: 'Arroz Branco',
              quantity: 120,
              clinical_mass_g: 120,
              kcal: 156,
              protein: 3,
              carbs: 34,
              fat: 0.3,
              imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-branco.jpg'
            },
            {
              id: 'i-feijao',
              name: 'Feijão Carioca',
              quantity: 100,
              clinical_mass_g: 100,
              kcal: 76,
              protein: 5,
              carbs: 14,
              fat: 0.5,
              imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/feijao-carioca.jpg'
            },
            {
              id: 'i-frango',
              name: 'Frango Grelhado',
              quantity: 150,
              clinical_mass_g: 150,
              kcal: 240,
              protein: 45,
              carbs: 0,
              fat: 6,
              imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg'
            }
          ]),
          createMeal('Lanche da Tarde', '16:00', d, [
            {
              id: 'i-iogurte',
              name: 'Iogurte com Frutas',
              quantity: 1,
              clinical_mass_g: 200,
              kcal: 180,
              protein: 12,
              carbs: 25,
              fat: 4,
              imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-frutas.jpg'
            }
          ]),
          createMeal('Jantar', '20:00', d, [
            {
              id: 'i-sopa',
              name: 'Sopa de Legumes',
              quantity: 1,
              clinical_mass_g: 350,
              kcal: 250,
              protein: 25,
              carbs: 15,
              fat: 8,
              imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes%2Fsopa-de-legumes.jpg'
            }
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
