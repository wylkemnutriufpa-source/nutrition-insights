
import { supabase } from "@/integrations/supabase/client";
import { V3DietTemplate } from "../types/types";

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

    if (error) {
      console.error('[DietTemplateService] Error listing templates:', error);
      return [];
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

    if (error) {
      console.error(`[DietTemplateService] Error fetching template ${slug}:`, error);
      return null;
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

    if (error) {
      console.error(`[DietTemplateService] Error fetching templates for objective ${objective}:`, error);
      return [];
    }

    return (data as unknown) as V3DietTemplate[];
  }
}
