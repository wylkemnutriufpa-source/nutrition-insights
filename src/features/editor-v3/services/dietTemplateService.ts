
import { supabase } from "@/integrations/supabase/client";
import { V3DietTemplate, KcalProfile, Meal } from "../types/types";
import { generatePremiumTemplates } from "@/lib/seedV3Templates";

const KCAL_PROFILES: KcalProfile[] = [
  { kcal: 1200, meal_intensity: 'low' },
  { kcal: 1400, meal_intensity: 'low' },
  { kcal: 1500, meal_intensity: 'low' },
  { kcal: 1600, meal_intensity: 'medium' },
  { kcal: 1800, meal_intensity: 'medium' },
  { kcal: 2200, meal_intensity: 'high' },
  { kcal: 2500, meal_intensity: 'high' }
];

const MOCK_TEMPLATES: V3DietTemplate[] = generatePremiumTemplates();

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
