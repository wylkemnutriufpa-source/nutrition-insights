/**
 * INVENTÁRIO DE FUNCIONALIDADES DA PLATAFORMA FITJOURNEY
 *
 * BLINDAGEM: Este arquivo é FALLBACK.
 * A fonte única de verdade é a tabela `platform_features` no Supabase.
 * Estes dados são usados APENAS se a tabela não existir ou falhar.
 *
 * Para atualizar contagens: altere a tabela no banco.
 * Este arquivo NÃO é a fonte de verdade para contagens.
 */

import { getPlatformFeaturesFromDB, deriveDynamicCounts } from '@/lib/adminServices';
import { supabase } from '@/integrations/supabase/client';

export const FEATURE_CATEGORIES = {
  PACIENTES: 'Pacientes',
  NUTRICAO: 'Nutrição',
  IA: 'Inteligência Artificial',
  COMUNICACAO: 'Comunicação',
  MONITORAMENTO: 'Monitoramento',
  GESTAO: 'Gestão',
  FERRAMENTAS: 'Ferramentas'
};

// ==================== FALLBACK LOCAL (usado se tabela não existir) ====================

export type PlatformFeature = {
  key: string;
  label: string;
  description: string;
  category: string;
  impactLevel: string;
  route?: string;
  is_ai?: boolean;
  is_active?: boolean;
};

const LOCAL_FEATURES: PlatformFeature[] = [
  { key: 'view_patients_list', label: 'Lista de Pacientes', description: 'Visualizar e filtrar todos os pacientes cadastrados', category: FEATURE_CATEGORIES.PACIENTES, route: '/professional/patients', impactLevel: 'basic' },
  { key: 'create_patient', label: 'Cadastrar Paciente', description: 'Adicionar novo paciente à plataforma', category: FEATURE_CATEGORIES.PACIENTES, impactLevel: 'high' },
  { key: 'view_patient_profile', label: 'Perfil do Paciente', description: 'Acessar perfil completo com todas as informações', category: FEATURE_CATEGORIES.PACIENTES, impactLevel: 'basic' },
  { key: 'configure_patient_menu', label: 'Configurar Menu do Paciente', description: 'Personalizar funcionalidades visíveis', category: FEATURE_CATEGORIES.PACIENTES, impactLevel: 'medium' },
  { key: 'create_anamnesis', label: 'Preencher Anamnese', description: 'Criar ou atualizar anamnese completa', category: FEATURE_CATEGORIES.PACIENTES, impactLevel: 'high' },
  { key: 'create_meal_plan', label: 'Criar Plano Alimentar', description: 'Montar plano personalizado com refeições e macros', category: FEATURE_CATEGORIES.NUTRICAO, impactLevel: 'high' },
  { key: 'edit_meal_plan', label: 'Editar Plano Alimentar', description: 'Modificar plano alimentar existente', category: FEATURE_CATEGORIES.NUTRICAO, route: '/professional/meal-plan-editor', impactLevel: 'medium' },
  { key: 'create_draft_plan', label: 'Rascunho de Plano', description: 'Salvar rascunho para revisão', category: FEATURE_CATEGORIES.NUTRICAO, impactLevel: 'medium' },
  { key: 'create_supplement', label: 'Prescrever Suplementação', description: 'Criar prescrição de suplementos', category: FEATURE_CATEGORIES.NUTRICAO, impactLevel: 'medium' },
  { key: 'view_templates', label: 'Acessar Templates Globais', description: 'Visualizar e gerenciar templates reutilizáveis', category: FEATURE_CATEGORIES.NUTRICAO, route: '/professional/templates', impactLevel: 'medium' },
  { key: 'create_template', label: 'Criar Template Global', description: 'Criar template reutilizável', category: FEATURE_CATEGORIES.NUTRICAO, impactLevel: 'strategic' },
  { key: 'use_meal_photo_analysis', label: 'Análise de Pratos por IA', description: 'Analisar qualidade e macros por foto', category: FEATURE_CATEGORIES.IA, impactLevel: 'strategic' },
  { key: 'use_body_analysis', label: 'Análise Corporal por IA', description: 'Análise de composição corporal por fotos', category: FEATURE_CATEGORIES.IA, impactLevel: 'strategic' },
  { key: 'view_smart_recommendations', label: 'Recomendações Inteligentes', description: 'Recomendações automáticas da IA', category: FEATURE_CATEGORIES.IA, route: '/professional/dashboard', impactLevel: 'strategic' },
  { key: 'view_risk_ranking', label: 'Ranking de Risco', description: 'Ranking de pacientes por score de risco', category: FEATURE_CATEGORIES.IA, route: '/professional/dashboard', impactLevel: 'high' },
  { key: 'view_feedbacks', label: 'Visualizar Feedbacks', description: 'Acessar feedbacks dos pacientes', category: FEATURE_CATEGORIES.COMUNICACAO, route: '/professional/feedbacks', impactLevel: 'basic' },
  { key: 'reply_feedback', label: 'Responder Feedback', description: 'Enviar resposta a feedback', category: FEATURE_CATEGORIES.COMUNICACAO, impactLevel: 'high' },
  { key: 'respond_sos', label: 'Responder SOS', description: 'Atender emergência nutricional', category: FEATURE_CATEGORIES.COMUNICACAO, impactLevel: 'strategic' },
  { key: 'send_patient_message', label: 'Enviar Mensagem', description: 'Enviar mensagem direta', category: FEATURE_CATEGORIES.COMUNICACAO, impactLevel: 'medium' },
  { key: 'create_feedback_reminder', label: 'Criar Lembrete de Feedback', description: 'Agendar lembrete de feedback', category: FEATURE_CATEGORIES.COMUNICACAO, impactLevel: 'medium' },
  { key: 'view_dashboard', label: 'Acessar Dashboard', description: 'Central de Comando com métricas', category: FEATURE_CATEGORIES.MONITORAMENTO, route: '/professional/dashboard', impactLevel: 'basic' },
  { key: 'view_engagement_chart', label: 'Gráfico de Engajamento', description: 'Gráfico de adesão ao checklist', category: FEATURE_CATEGORIES.MONITORAMENTO, route: '/professional/dashboard', impactLevel: 'medium' },
  { key: 'create_physical_assessment', label: 'Avaliação Física', description: 'Registrar medidas antropométricas', category: FEATURE_CATEGORIES.MONITORAMENTO, impactLevel: 'high' },
  { key: 'create_checklist_template', label: 'Criar Checklist', description: 'Criar template de checklist diário', category: FEATURE_CATEGORIES.MONITORAMENTO, impactLevel: 'high' },
  { key: 'view_agenda', label: 'Acessar Agenda', description: 'Visualizar agenda de consultas', category: FEATURE_CATEGORIES.GESTAO, route: '/professional/agenda', impactLevel: 'basic' },
  { key: 'create_calendar_event', label: 'Criar Evento na Agenda', description: 'Agendar consulta ou compromisso', category: FEATURE_CATEGORIES.GESTAO, impactLevel: 'medium' },
  { key: 'view_financeiro', label: 'Acessar Financeiro', description: 'Controle financeiro', category: FEATURE_CATEGORIES.GESTAO, route: '/professional/financeiro', impactLevel: 'basic' },
  { key: 'create_financial_record', label: 'Registrar Pagamento', description: 'Criar registro financeiro', category: FEATURE_CATEGORIES.GESTAO, impactLevel: 'medium' },
  { key: 'configure_branding', label: 'Personalizar Marca', description: 'Configurar logo e identidade visual', category: FEATURE_CATEGORIES.GESTAO, route: '/professional/branding', impactLevel: 'medium' },
  { key: 'view_settings', label: 'Configurações', description: 'Configurações da conta', category: FEATURE_CATEGORIES.GESTAO, route: '/professional/settings', impactLevel: 'basic' },
  { key: 'view_food_database', label: 'Banco de Alimentos', description: 'Banco de informações nutricionais', category: FEATURE_CATEGORIES.FERRAMENTAS, route: '/professional/food-database', impactLevel: 'basic' },
  { key: 'create_custom_food', label: 'Cadastrar Alimento', description: 'Adicionar alimento customizado', category: FEATURE_CATEGORIES.FERRAMENTAS, impactLevel: 'medium' },
  { key: 'view_recipes', label: 'Biblioteca de Receitas', description: 'Acessar receitas nutricionais', category: FEATURE_CATEGORIES.FERRAMENTAS, route: '/professional/receitas', impactLevel: 'basic' },
  { key: 'create_recipe', label: 'Criar Receita', description: 'Adicionar receita com ingredientes', category: FEATURE_CATEGORIES.FERRAMENTAS, impactLevel: 'medium' },
  { key: 'create_personalized_tip', label: 'Criar Dica Personalizada', description: 'Dica personalizada para paciente', category: FEATURE_CATEGORIES.FERRAMENTAS, impactLevel: 'medium' },
  { key: 'view_platform_guide', label: 'Central de Recursos', description: 'Tutorial e guia da plataforma', category: FEATURE_CATEGORIES.FERRAMENTAS, route: '/professional/guide', impactLevel: 'basic' },
  { key: 'view_automations', label: 'Central de Automações', description: 'Gerenciar automações inteligentes', category: FEATURE_CATEGORIES.IA, impactLevel: 'strategic' },
  { key: 'create_automation', label: 'Criar Automação', description: 'Criar regra de automação', category: FEATURE_CATEGORIES.IA, impactLevel: 'strategic' },
  { key: 'view_weekly_report', label: 'Relatório Semanal', description: 'Relatório automático semanal', category: FEATURE_CATEGORIES.IA, impactLevel: 'strategic' },
  { key: 'activate_automation_template', label: 'Ativar Template de Automação', description: 'Ativar automação pré-configurada', category: FEATURE_CATEGORIES.IA, impactLevel: 'high' },
  { key: 'scheduled_plan', label: 'Plano Programado', description: 'Automação de troca de plano alimentar', category: FEATURE_CATEGORIES.IA, impactLevel: 'strategic' }
];

// Conjunto de keys que são IA
const AI_FEATURE_KEYS = new Set([
  'view_dashboard', 'view_risk_ranking', 'view_dynamic_tips', 'analyze_meal_photo',
  'view_smart_recommendations', 'view_automations', 'create_automation',
  'view_weekly_report', 'activate_automation_template', 'use_meal_photo_analysis',
  'use_body_analysis', 'scheduled_plan'
]);

// Marcar is_ai no fallback
LOCAL_FEATURES.forEach(f => {
  f.is_ai = AI_FEATURE_KEYS.has(f.key) || f.category === FEATURE_CATEGORIES.IA;
});

// ==================== CACHE DE FEATURES DO BANCO ====================

let _cachedFeatures = null;
let _cachedCounts = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Converte features do banco (slug-based) para o formato local (key-based)
 */
const normalizeDBFeatures = (dbFeatures) => {
  return dbFeatures.map(f => ({
    key: f.slug,
    label: f.name,
    description: f.description || '',
    category: f.category,
    route: f.route || '',
    impactLevel: f.impact_level || 'basic',
    is_ai: f.is_ai || false,
    is_active: f.is_active !== false,
    icon_name: f.icon_name || '',
    id: f.id
  }));
};

/**
 * Carrega features do banco com cache
 * Retorna features normalizadas ou fallback local
 */
export const loadPlatformFeatures = async () => {
  // Check cache
  if (_cachedFeatures && (Date.now() - _cacheTimestamp) < CACHE_TTL) {
    return { features: _cachedFeatures, counts: _cachedCounts, source: 'cache' };
  }

  try {
    const { data, useFallback } = await getPlatformFeaturesFromDB();

    if (useFallback || !data) {
      // Usar fallback local
      _cachedFeatures = LOCAL_FEATURES;
      _cachedCounts = {
        total: LOCAL_FEATURES.length,
        totalAI: LOCAL_FEATURES.filter(f => f.is_ai).length,
        totalCategories: new Set(LOCAL_FEATURES.map(f => f.category)).size,
        totalActive: LOCAL_FEATURES.filter(f => f.is_active !== false).length
      };
      _cacheTimestamp = Date.now();
      return { features: _cachedFeatures, counts: _cachedCounts, source: 'fallback' };
    }

    // Normalizar dados do banco
    const normalized = normalizeDBFeatures(data);
    const counts = deriveDynamicCounts(data);

    _cachedFeatures = normalized;
    _cachedCounts = counts;
    _cacheTimestamp = Date.now();

    return { features: normalized, counts, source: 'database' };
  } catch (err) {
    console.error('Erro ao carregar features:', err);
    _cachedFeatures = LOCAL_FEATURES;
    _cachedCounts = {
      total: LOCAL_FEATURES.length,
      totalAI: LOCAL_FEATURES.filter(f => f.is_ai).length,
      totalCategories: new Set(LOCAL_FEATURES.map(f => f.category)).size,
      totalActive: LOCAL_FEATURES.filter(f => f.is_active !== false).length
    };
    _cacheTimestamp = Date.now();
    return { features: _cachedFeatures, counts: _cachedCounts, source: 'fallback' };
  }
};

// ==================== EXPORTS RETROCOMPATÍVEIS ====================

// Estes exports mantêm compatibilidade com código existente que importa diretamente
// Em runtime, serão substituídos pelo loader async quando disponível
export const PLATFORM_FEATURES = LOCAL_FEATURES;
export const TOTAL_FEATURES = LOCAL_FEATURES.length;

// DYNAMIC_COUNTS agora é derivado do banco quando possível
// O fallback continua funcionando via LOCAL_FEATURES
export const DYNAMIC_COUNTS = {
  get total() { return (_cachedCounts?.total) || LOCAL_FEATURES.length; },
  get totalAI() { return (_cachedCounts?.totalAI) || LOCAL_FEATURES.filter(f => f.is_ai).length; },
  get totalCategories() { return (_cachedCounts?.totalCategories) || new Set(LOCAL_FEATURES.map(f => f.category)).size; },
  get totalActive() { return (_cachedCounts?.totalActive) || LOCAL_FEATURES.filter(f => f.is_active !== false).length; }
};

/**
 * Retorna features agrupadas por categoria
 * Usa cache se disponível
 */
export const getFeaturesByCategory = (features = null) => {
  const source = features || _cachedFeatures || LOCAL_FEATURES;
  const grouped = {};
  for (const cat of Object.values(FEATURE_CATEGORIES)) {
    grouped[cat] = source.filter(f => f.category === cat);
  }
  return grouped;
};

/**
 * Mapa de featureKey → feature para lookup rápido
 */
export const FEATURE_MAP = Object.fromEntries(
  LOCAL_FEATURES.map(f => [f.key, f])
);

/**
 * Atualizar FEATURE_MAP com dados do banco (chamar após loadPlatformFeatures)
 */
export const updateFeatureMap = (features) => {
  features.forEach(f => {
    FEATURE_MAP[f.key] = f;
  });
};

// Emojis por categoria
export const CATEGORY_EMOJIS = {
  [FEATURE_CATEGORIES.PACIENTES]: '👥',
  [FEATURE_CATEGORIES.NUTRICAO]: '🥗',
  [FEATURE_CATEGORIES.IA]: '🤖',
  [FEATURE_CATEGORIES.COMUNICACAO]: '💬',
  [FEATURE_CATEGORIES.MONITORAMENTO]: '📊',
  [FEATURE_CATEGORIES.GESTAO]: '⚙️',
  [FEATURE_CATEGORIES.FERRAMENTAS]: '🛠️'
};

// Gradientes por categoria
export const CATEGORY_GRADIENTS = {
  [FEATURE_CATEGORIES.PACIENTES]: 'from-blue-500 to-indigo-600',
  [FEATURE_CATEGORIES.NUTRICAO]: 'from-green-500 to-emerald-600',
  [FEATURE_CATEGORIES.IA]: 'from-purple-500 to-pink-600',
  [FEATURE_CATEGORIES.COMUNICACAO]: 'from-amber-500 to-orange-600',
  [FEATURE_CATEGORIES.MONITORAMENTO]: 'from-teal-500 to-cyan-600',
  [FEATURE_CATEGORIES.GESTAO]: 'from-slate-500 to-gray-600',
  [FEATURE_CATEGORIES.FERRAMENTAS]: 'from-rose-500 to-red-600'
};
