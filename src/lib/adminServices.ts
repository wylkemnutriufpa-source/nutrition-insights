import { supabase } from "@/integrations/supabase/client";
import { FEATURE_MAP } from "@/constants/platformFeatureInventory";

export const invalidateFeatureFlagsCache = () => {
  // Simple cache invalidation for the frontend
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('feature-flags-updated'));
  }
};

/**
 * Atualizar feature flag (somente admin)
 */
export const updateFeatureFlag = async (featureId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('platform_features')
      .update(updates)
      .eq('id', featureId)
      .select()
      .single();
    if (!error) invalidateFeatureFlagsCache();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Buscar todas as features para o Admin
 */
export const getAllFeaturesAdmin = async () => {
  try {
    const { data, error } = await supabase
      .from('platform_features')
      .select('*')
      .order('category')
      .order('name');
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
};

/**
 * Buscar features do banco (usado pelo loader)
 */
export const getPlatformFeaturesFromDB = async () => {
    try {
        const { data, error } = await supabase
          .from('platform_features')
          .select('*');
        return { data: data || null, error, useFallback: !!error };
      } catch (err) {
        return { data: null, error: err, useFallback: true };
      }
};

export const deriveDynamicCounts = (data: any[]) => {
    return {
        total: data.length,
        totalAI: data.filter(f => f.is_ai).length,
        totalCategories: new Set(data.map(f => f.category)).size,
        totalActive: data.filter(f => f.is_active !== false).length
    };
};

/**
 * Atualizar plan_type de um profissional (somente admin)
 */
export const updateProfessionalPlan = async (professionalId: string, planType: string, expiresAt: string | null = null) => {
  try {
    const updates: any = {
      plan_type: planType,
      plan_started_at: new Date().toISOString()
    };
    if (expiresAt) updates.plan_expires_at = expiresAt;
    
    // Configuração baseada no tipo de plano
    if (planType === 'trial' && !expiresAt) {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      updates.plan_expires_at = date.toISOString();
    } else if (planType !== 'trial') {
      updates.plan_expires_at = null; // Basic e PRO expiram daqui a um ano ou conforme cobrança (a definir)
      
      if (!expiresAt) {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        updates.plan_expires_at = date.toISOString();
      }
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', professionalId)
      .select()
      .single();
      
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};
