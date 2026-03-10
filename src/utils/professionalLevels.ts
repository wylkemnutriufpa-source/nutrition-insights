/**
 * SISTEMA DE NÍVEIS E GAMIFICAÇÃO - BASEADO EM PONTOS
 * 
 * Pontuação dinâmica:
 * +10 por funcionalidade utilizada
 * +20 por automação ativa
 * +30 por feature de IA utilizada
 * +15 se acessar relatórios 3x na semana
 * +25 se ativar onboarding automático
 */

import {
  Compass, Flame, Target, Rocket, Crown
} from 'lucide-react';

// ==================== REGRAS DE PONTUAÇÃO ====================
export const SCORING_RULES = {
  FEATURE_USED: { points: 10, label: 'Funcionalidade utilizada', emoji: '⚡' },
  AUTOMATION_ACTIVE: { points: 20, label: 'Automação ativa', emoji: '🤖' },
  AI_FEATURE_USED: { points: 30, label: 'Feature de IA utilizada', emoji: '🧠' },
  REPORTS_FREQUENT: { points: 15, label: 'Relatórios acessados 3x/semana', emoji: '📊' },
  ONBOARDING_ACTIVE: { points: 25, label: 'Onboarding automático ativo', emoji: '🚀' }
};

// ==================== NÍVEIS ====================
export const PROFESSIONAL_LEVELS = [
  {
    id: 'explorador',
    name: 'Explorador',
    minPoints: 0,
    maxPoints: 50,
    badgeColor: 'from-blue-400 to-blue-600',
    badgeBg: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: Compass,
    emoji: '🧭',
    message: 'Bem-vindo! Explore as funcionalidades para subir de nível.',
    nextThreshold: 51
  },
  {
    id: 'engajado',
    name: 'Engajado',
    minPoints: 51,
    maxPoints: 120,
    badgeColor: 'from-emerald-400 to-emerald-600',
    badgeBg: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    icon: Flame,
    emoji: '🔥',
    message: 'Ótimo ritmo! Você está engajado com a plataforma.',
    nextThreshold: 121
  },
  {
    id: 'estrategico',
    name: 'Estratégico',
    minPoints: 121,
    maxPoints: 250,
    badgeColor: 'from-purple-400 to-purple-600',
    badgeBg: 'bg-purple-100',
    textColor: 'text-purple-700',
    icon: Target,
    emoji: '🎯',
    message: 'Impressionante! Você usa a plataforma de forma estratégica.',
    nextThreshold: 251
  },
  {
    id: 'profissional',
    name: 'Profissional',
    minPoints: 251,
    maxPoints: 400,
    badgeColor: 'from-orange-400 to-orange-600',
    badgeBg: 'bg-orange-100',
    textColor: 'text-orange-700',
    icon: Rocket,
    emoji: '🚀',
    message: 'Nível avançado! Você domina a plataforma.',
    nextThreshold: 401
  },
  {
    id: 'elite',
    name: 'Elite',
    minPoints: 401,
    maxPoints: 9999,
    badgeColor: 'from-amber-400 to-yellow-500',
    badgeBg: 'bg-amber-100',
    textColor: 'text-amber-700',
    icon: Crown,
    emoji: '👑',
    message: 'Parabéns! Você é um Profissional Elite da FitJourney!',
    nextThreshold: null
  }
];

// ==================== CÁLCULOS ====================

/**
 * Calcula pontuação total baseada em dados reais
 * @param {Object} data - { featuresUsed: Set, aiFeatures: Set, automationRules: Array, reportAccessCount: number }
 * @returns {Object} { totalPoints, breakdown }
 */
export const calculateScore = (data = {}) => {
  const breakdown = [];
  let totalPoints = 0;

  // +10 por funcionalidade utilizada
  const featuresCount = data.featuresUsed?.size || 0;
  if (featuresCount > 0) {
    const pts = featuresCount * SCORING_RULES.FEATURE_USED.points;
    totalPoints += pts;
    breakdown.push({ ...SCORING_RULES.FEATURE_USED, count: featuresCount, total: pts });
  }

  // +30 por feature de IA utilizada (adicional ao +10)
  const aiCount = data.aiFeatures?.size || 0;
  if (aiCount > 0) {
    const pts = aiCount * SCORING_RULES.AI_FEATURE_USED.points;
    totalPoints += pts;
    breakdown.push({ ...SCORING_RULES.AI_FEATURE_USED, count: aiCount, total: pts });
  }

  // +20 por automação ativa
  const activeAutomations = data.automationRules?.filter(r => r.is_active)?.length || 0;
  if (activeAutomations > 0) {
    const pts = activeAutomations * SCORING_RULES.AUTOMATION_ACTIVE.points;
    totalPoints += pts;
    breakdown.push({ ...SCORING_RULES.AUTOMATION_ACTIVE, count: activeAutomations, total: pts });
  }

  // +15 se acessar relatórios 3x na semana
  const reportCount = data.reportAccessCount || 0;
  if (reportCount >= 3) {
    totalPoints += SCORING_RULES.REPORTS_FREQUENT.points;
    breakdown.push({ ...SCORING_RULES.REPORTS_FREQUENT, count: 1, total: SCORING_RULES.REPORTS_FREQUENT.points });
  }

  // +25 se onboarding automático está ativo
  const hasOnboarding = data.automationRules?.some(r => r.trigger_type === 'new_patient' && r.is_active);
  if (hasOnboarding) {
    totalPoints += SCORING_RULES.ONBOARDING_ACTIVE.points;
    breakdown.push({ ...SCORING_RULES.ONBOARDING_ACTIVE, count: 1, total: SCORING_RULES.ONBOARDING_ACTIVE.points });
  }

  return { totalPoints, breakdown };
};

/**
 * Calcula o nível atual baseado em pontos
 */
export const getCurrentLevel = (points) => {
  for (let i = PROFESSIONAL_LEVELS.length - 1; i >= 0; i--) {
    if (points >= PROFESSIONAL_LEVELS[i].minPoints) {
      return PROFESSIONAL_LEVELS[i];
    }
  }
  return PROFESSIONAL_LEVELS[0];
};

/**
 * Calcula o próximo nível
 */
export const getNextLevel = (points) => {
  const current = getCurrentLevel(points);
  const currentIdx = PROFESSIONAL_LEVELS.findIndex(l => l.id === current.id);
  if (currentIdx < PROFESSIONAL_LEVELS.length - 1) {
    return PROFESSIONAL_LEVELS[currentIdx + 1];
  }
  return null;
};

/**
 * Calcula pontos faltando para próximo nível
 */
export const getPointsUntilNextLevel = (points) => {
  const nextLevel = getNextLevel(points);
  if (!nextLevel) return 0;
  return Math.max(0, nextLevel.minPoints - points);
};

/**
 * Calcula progresso dentro do nível atual (0-100%)
 */
export const getLevelProgress = (points) => {
  const current = getCurrentLevel(points);
  const next = getNextLevel(points);
  if (!next) return 100; // Elite
  const range = next.minPoints - current.minPoints;
  if (range <= 0) return 100;
  const progress = points - current.minPoints;
  return Math.min(100, Math.round((progress / range) * 100));
};

/**
 * Calcula medalhas por categoria (mantém compatibilidade)
 */
export const calculateCategoryMedals = (usedByCategory, featuresByCategory) => {
  const medals = [];
  for (const [category, features] of Object.entries(featuresByCategory)) {
    const totalInCategory = features.length;
    const usedInCategory = usedByCategory[category]?.size || 0;
    const percentage = totalInCategory > 0 ? (usedInCategory / totalInCategory) * 100 : 0;

    let medal = null;
    if (percentage >= 100) medal = { type: 'gold', emoji: '🥇', label: 'Mestre' };
    else if (percentage >= 75) medal = { type: 'silver', emoji: '🥈', label: 'Avançado' };
    else if (percentage >= 50) medal = { type: 'bronze', emoji: '🥉', label: 'Ativo' };

    if (medal) {
      medals.push({ category, ...medal, usedCount: usedInCategory, totalCount: totalInCategory, percentage: Math.round(percentage) });
    }
  }
  return medals.sort((a, b) => b.percentage - a.percentage);
};

/**
 * Compatibilidade: getFeaturesUntilNextLevel agora retorna pontos faltando
 */
export const getFeaturesUntilNextLevel = (activatedCount, totalFeatures) => {
  // Backward compatibility - mas agora calcula baseado em pontos estimados
  const estimatedPoints = activatedCount * SCORING_RULES.FEATURE_USED.points;
  return getPointsUntilNextLevel(estimatedPoints);
};
