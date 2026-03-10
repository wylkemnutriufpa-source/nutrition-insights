/**
 * SISTEMA DE TRACKING CENTRALIZADO DE FUNCIONALIDADES
 * 
 * trackProfessionalFeature(featureKey) - Função global
 * 
 * Regras:
 * - Só registra se featureKey existir no inventário
 * - Upsert seguro com incremento de usage_count
 * - Debounce de 60s por feature
 * - Nunca bloqueia UI
 * - try/catch silencioso
 */

import { FEATURE_MAP } from '@/constants/platformFeatureInventory';

// Cache de debounce: { featureKey: timestamp }
const _debounceCache = {};
const DEBOUNCE_MS = 60000; // 60 segundos

// Referência lazy para supabase (evita import circular)
let _supabaseClient = null;

const getSupabase = async () => {
  if (!_supabaseClient) {
    const mod = await import('@/integrations/supabase/client');
    _supabaseClient = mod.supabase;
  }
  return _supabaseClient;
};

/**
 * Registra uso de uma funcionalidade pelo profissional.
 * Upsert seguro, debounce de 60s, nunca bloqueia UI.
 * 
 * @param {string} featureKey - Chave da feature (deve existir no inventário)
 * @returns {void} - Fire and forget
 */
export const trackProfessionalFeature = (featureKey) => {
  // Validar: feature deve existir no inventário
  if (!FEATURE_MAP[featureKey]) {
    return; // Ignora silenciosamente features desconhecidas
  }

  // Debounce: não registrar mesma feature dentro de 60s
  const now = Date.now();
  if (_debounceCache[featureKey] && (now - _debounceCache[featureKey]) < DEBOUNCE_MS) {
    return;
  }
  _debounceCache[featureKey] = now;

  // Fire and forget - nunca bloqueia UI
  _doTrack(featureKey).catch(() => {
    // Silencioso - não atrapalha a experiência do usuário
  });
};

/**
 * Execução real do tracking (async, isolado)
 * Quando INSERT (primeiro uso), incrementa a meta mensal automaticamente
 */
const _doTrack = async (featureKey) => {
  try {
    const supabase = await getSupabase();
    
    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const professionalId = user.id;

    // Tentar upsert: se já existe, incrementa; se não, insere
    const { data: existing } = await supabase
      .from('professional_feature_usage')
      .select('id, usage_count')
      .eq('professional_id', professionalId)
      .eq('feature_key', featureKey)
      .maybeSingle();

    if (existing) {
      // UPDATE: feature já usada antes — apenas incrementar contagem
      await supabase
        .from('professional_feature_usage')
        .update({
          usage_count: (existing.usage_count || 1) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // INSERT: primeiro uso desta feature — registrar e incrementar meta mensal
      await supabase
        .from('professional_feature_usage')
        .insert({
          professional_id: professionalId,
          feature_key: featureKey,
          usage_count: 1,
          first_used_at: new Date().toISOString(),
          last_used_at: new Date().toISOString()
        });

      // Incrementar meta mensal (primeiro uso = nova feature ativada)
      incrementMonthlyGoal(professionalId).catch(() => {});
    }
  } catch {
    // Silencioso - tracking nunca deve impactar UX
  }
};

/**
 * Busca todas as features usadas por um profissional
 * @param {string} professionalId
 * @returns {Promise<Array>} Lista de registros de uso
 */
export const getProfessionalFeatureUsage = async (professionalId) => {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('professional_feature_usage')
      .select('*')
      .eq('professional_id', professionalId)
      .order('last_used_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
};

/**
 * Busca ranking de profissionais por features ativadas (admin)
 * @returns {Promise<Array>}
 */
export const getProfessionalRanking = async () => {
  try {
    const supabase = await getSupabase();
    
    // Buscar contagem de features únicas por profissional
    const { data, error } = await supabase
      .from('professional_feature_usage')
      .select('professional_id, feature_key');

    if (error) throw error;
    if (!data) return [];

    // Agrupar por profissional
    const grouped = {};
    for (const row of data) {
      if (!grouped[row.professional_id]) {
        grouped[row.professional_id] = new Set();
      }
      grouped[row.professional_id].add(row.feature_key);
    }

    // Buscar perfis
    const profIds = Object.keys(grouped);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', profIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    // Montar ranking
    const ranking = profIds.map(id => ({
      professionalId: id,
      name: profileMap[id]?.name || 'Profissional',
      email: profileMap[id]?.email || '',
      featuresUsed: grouped[id].size,
      percentage: Math.round((grouped[id].size / Object.keys(FEATURE_MAP).length) * 100)
    }));

    return ranking.sort((a, b) => b.featuresUsed - a.featuresUsed);
  } catch {
    return [];
  }
};

/**
 * Metas mensais: buscar ou criar meta do mês atual
 */
export const getOrCreateMonthlyGoal = async (professionalId) => {
  try {
    const supabase = await getSupabase();
    const now = new Date();
    const monthRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: existing } = await supabase
      .from('professional_monthly_goals')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('month_reference', monthRef)
      .maybeSingle();

    if (existing) return existing;

    // Criar meta default: 5 features novas por mês
    const { data: created } = await supabase
      .from('professional_monthly_goals')
      .insert({
        professional_id: professionalId,
        month_reference: monthRef,
        target_features_to_activate: 5,
        activated_count: 0
      })
      .select()
      .single();

    return created;
  } catch {
    return { target_features_to_activate: 5, activated_count: 0, month_reference: '' };
  }
};

/**
 * Incrementa contagem de features ativadas na meta mensal
 */
export const incrementMonthlyGoal = async (professionalId) => {
  try {
    const supabase = await getSupabase();
    const now = new Date();
    const monthRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: existing } = await supabase
      .from('professional_monthly_goals')
      .select('id, activated_count')
      .eq('professional_id', professionalId)
      .eq('month_reference', monthRef)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('professional_monthly_goals')
        .update({ activated_count: (existing.activated_count || 0) + 1 })
        .eq('id', existing.id);
    }
  } catch {
    // Silencioso
  }
};
