
import { supabase } from "@/integrations/supabase/client";
import { V3DietTemplate, KcalProfile, Meal } from "../types/types";

// Helper to generate a complete sovereign day
const createSovereignDay = (day: number) => ({
  day_of_week: day,
  meals: [
    {
      id: `m-breakfast-${day}`,
      name: 'Café da Manhã',
      time: '08:00',
      items: [
        {
          id: `i-pao-${day}`,
          title: 'Pão Integral com Ovo',
          quantity_display: '2 fatias + 2 ovos',
          clinical_mass_g: 150,
          macros: { kcal: 320, protein_g: 18, carbs_g: 30, fat_g: 14 },
          visual: { image_url: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-integral.jpg', is_placeholder: false },
          substitutions: []
        }
      ]
    },
    {
      id: `m-lunch-${day}`,
      name: 'Almoço',
      time: '13:00',
      items: [
        {
          id: `i-almoco-${day}`,
          title: 'Arroz, Feijão e Frango Grelhado',
          quantity_display: '150g arroz + 100g feijão + 150g frango',
          clinical_mass_g: 400,
          macros: { kcal: 550, protein_g: 45, carbs_g: 60, fat_g: 12 },
          visual: { image_url: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png', is_placeholder: false },
          substitutions: []
        }
      ]
    },
    {
      id: `m-snack-${day}`,
      name: 'Lanche da Tarde',
      time: '16:00',
      items: [
        {
          id: `i-snack-${day}`,
          title: 'Iogurte com Frutas',
          quantity_display: '1 unidade + 100g fruta',
          clinical_mass_g: 250,
          macros: { kcal: 180, protein_g: 12, carbs_g: 25, fat_g: 4 },
          visual: { image_url: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-com-frutas.jpg', is_placeholder: false },
          substitutions: []
        }
      ]
    },
    {
      id: `m-dinner-${day}`,
      name: 'Jantar',
      time: '20:00',
      items: [
        {
          id: `i-dinner-${day}`,
          title: 'Omelete de Legumes',
          quantity_display: '3 ovos + legumes à vontade',
          clinical_mass_g: 300,
          macros: { kcal: 350, protein_g: 24, carbs_g: 10, fat_g: 22 },
          visual: { image_url: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes%2Fsopa-de-legumes.jpg', is_placeholder: false },
          substitutions: []
        }
      ]
    }
  ]
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
        publication_id: 'template-seed-1',
        snapshot_version: 'v3',
        generated_at: new Date().toISOString(),
        targets: { kcal: 2000, protein_g: 120, carbs_g: 200, fat_g: 70 },
        days: [1, 2, 3, 4, 5, 6, 0].map(d => createSovereignDay(d)),
        daily_totals: {}
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
