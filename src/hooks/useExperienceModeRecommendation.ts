import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { ExperienceMode } from "@/hooks/useExperienceMode";

/**
 * IFJ Experience Mode Recommendation Engine v2
 *
 * Motor determinístico que analisa sinais reais de uso do produto
 * para sugerir o nível de experiência ideal para o profissional.
 *
 * Sinais avaliados:
 *  1. Pacientes ativos vinculados
 *  2. Planos alimentares criados/publicados
 *  3. Protocolos clínicos ativos
 *  4. Alertas clínicos revisados (resolvidos)
 *  5. Automações criadas
 *  6. Tempo desde cadastro (maturidade)
 *  7. Atividade recente (últimos 7 dias via audit_logs)
 *  8. Uso do IFJ (clinical_decisions geradas)
 */

export interface ModeRecommendation {
  suggested: ExperienceMode;
  reason: string;
  confidence: number;
  factors: RecommendationFactors;
  loading: boolean;
  /** Future gating: tiers that could be unlocked */
  eligibleTiers: ExperienceMode[];
}

export interface RecommendationFactors {
  activePatients: number;
  mealPlansCreated: number;
  protocolsUsed: number;
  alertsReviewed: number;
  automationsCreated: number;
  daysSinceSignup: number;
  recentActivityDays: number;
  clinicalDecisions: number;
}

const CACHE_KEY = "fj_mode_recommendation";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DISMISS_KEY = "fj_mode_rec_dismissed";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const APPLIED_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function dismissRecommendation() {
  localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts: Date.now(), type: "dismiss" }));
}

export function markRecommendationApplied() {
  localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts: Date.now(), type: "applied" }));
}

export function isRecommendationCoolingDown(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const { ts, type } = JSON.parse(raw);
    const cooldown = type === "applied" ? APPLIED_COOLDOWN_MS : DISMISS_COOLDOWN_MS;
    return Date.now() - ts < cooldown;
  } catch {
    return false;
  }
}

export function useExperienceModeRecommendation(): ModeRecommendation {
  const { user } = useAuth();
  const [result, setResult] = useState<ModeRecommendation>(defaultResult);

  useEffect(() => {
    if (!user) return;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL_MS) {
          setResult({ ...parsed.data, loading: false });
          return;
        }
      }
    } catch {}

    computeRecommendation(user.id).then((rec) => {
      setResult({ ...rec, loading: false });
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: rec, ts: Date.now() }));
      } catch {}
    });
  }, [user]);

  return result;
}

const defaultResult: ModeRecommendation = {
  suggested: "pro",
  reason: "",
  confidence: 0,
  factors: {
    activePatients: 0,
    mealPlansCreated: 0,
    protocolsUsed: 0,
    alertsReviewed: 0,
    automationsCreated: 0,
    daysSinceSignup: 0,
    recentActivityDays: 0,
    clinicalDecisions: 0,
  },
  loading: true,
  eligibleTiers: ["basic", "pro"],
};

// ── Fetch helpers ──

async function fetchCounts(userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    patientsRes,
    profileRes,
    mealPlansRes,
    protocolsRes,
    alertsReviewedRes,
    automationRes,
    recentActivityRes,
    clinicalDecisionsRes,
  ] = await Promise.all([
    supabase
      .from("nutritionist_patients")
      .select("id", { count: "exact", head: true })
      .eq("nutritionist_id", userId)
      .eq("status", "active"),
    supabase
      .from("profiles")
      .select("created_at")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("meal_plans")
      .select("id", { count: "exact", head: true })
      .eq("nutritionist_id", userId)
      .in("plan_status", ["published", "active", "approved"]),
    supabase
      .from("patient_protocols")
      .select("id", { count: "exact", head: true })
      .eq("nutritionist_id", userId),
    supabase
      .from("clinical_alerts")
      .select("id", { count: "exact", head: true })
      .eq("nutritionist_id", userId)
      .eq("is_active", false),
    supabase
      .from("automation_rules")
      .select("id", { count: "exact", head: true })
      .eq("nutritionist_id", userId),
    // Atividade recente: dias distintos com ação nos últimos 7 dias
    supabase
      .from("audit_logs")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo)
      .limit(200),
    // Uso do IFJ: decisões clínicas aplicadas/revisadas
    supabase
      .from("clinical_decisions")
      .select("id", { count: "exact", head: true })
      .eq("nutritionist_id", userId)
      .not("acted_at", "is", null),
  ]);

  // Calcular dias únicos com atividade nos últimos 7
  const recentActivityDays = recentActivityRes.data
    ? new Set(
        recentActivityRes.data.map((r) =>
          new Date(r.created_at).toISOString().slice(0, 10)
        )
      ).size
    : 0;

  const daysSinceSignup = profileRes.data?.created_at
    ? Math.floor(
        (Date.now() - new Date(profileRes.data.created_at).getTime()) / 86400000
      )
    : 0;

  return {
    activePatients: patientsRes.count ?? 0,
    mealPlansCreated: mealPlansRes.count ?? 0,
    protocolsUsed: protocolsRes.count ?? 0,
    alertsReviewed: alertsReviewedRes.count ?? 0,
    automationsCreated: automationRes.count ?? 0,
    daysSinceSignup,
    recentActivityDays,
    clinicalDecisions: clinicalDecisionsRes.count ?? 0,
  };
}

// ── Scoring Engine v2 ──

function computeScore(f: RecommendationFactors): number {
  let score = 0;

  // 1. Pacientes (máx 30)
  if (f.activePatients >= 30) score += 30;
  else if (f.activePatients >= 15) score += 22;
  else if (f.activePatients >= 5) score += 12;
  else if (f.activePatients >= 1) score += 5;

  // 2. Planos alimentares (máx 20)
  if (f.mealPlansCreated >= 20) score += 20;
  else if (f.mealPlansCreated >= 10) score += 14;
  else if (f.mealPlansCreated >= 3) score += 8;
  else if (f.mealPlansCreated >= 1) score += 3;

  // 3. Protocolos clínicos (máx 15)
  if (f.protocolsUsed >= 10) score += 15;
  else if (f.protocolsUsed >= 3) score += 10;
  else if (f.protocolsUsed >= 1) score += 5;

  // 4. Alertas revisados (máx 10)
  if (f.alertsReviewed >= 10) score += 10;
  else if (f.alertsReviewed >= 3) score += 6;
  else if (f.alertsReviewed >= 1) score += 3;

  // 5. Automações (máx 15)
  if (f.automationsCreated >= 5) score += 15;
  else if (f.automationsCreated >= 2) score += 10;
  else if (f.automationsCreated >= 1) score += 5;

  // 6. Maturidade (máx 10)
  if (f.daysSinceSignup >= 90) score += 10;
  else if (f.daysSinceSignup >= 30) score += 6;
  else if (f.daysSinceSignup >= 7) score += 3;

  // 7. Atividade recente — consistência nos últimos 7 dias (máx 10)
  if (f.recentActivityDays >= 6) score += 10;
  else if (f.recentActivityDays >= 4) score += 7;
  else if (f.recentActivityDays >= 2) score += 4;
  else if (f.recentActivityDays >= 1) score += 1;

  // 8. Uso do IFJ — decisões clínicas (máx 15)
  if (f.clinicalDecisions >= 15) score += 15;
  else if (f.clinicalDecisions >= 5) score += 10;
  else if (f.clinicalDecisions >= 1) score += 5;

  // ── Penalidade de inatividade ──
  // Impede recomendar advanced para quem parou de usar
  if (f.recentActivityDays === 0 && f.daysSinceSignup >= 14) {
    score = Math.floor(score * 0.6);
  } else if (f.recentActivityDays <= 1 && f.daysSinceSignup >= 30) {
    score = Math.floor(score * 0.8);
  }

  return score;
}

// ── Classify ──

interface Classification {
  suggested: ExperienceMode;
  reason: string;
  confidence: number;
  eligibleTiers: ExperienceMode[];
}

function classify(score: number, f: RecommendationFactors): Classification {
  if (score >= 75) {
    return {
      suggested: "advanced",
      reason:
        "Seu perfil clínico já opera em nível avançado — protocolos, automações e decisões IFJ fazem parte da sua rotina. O modo Avançado desbloqueia o motor completo de inteligência para que você escale seu consultório com segurança.",
      confidence: Math.min(score, 97),
      eligibleTiers: ["basic", "pro", "advanced"],
    };
  }

  if (score >= 35) {
    return {
      suggested: "pro",
      reason:
        "Com sua base ativa de pacientes e planos estruturados, o modo Profissional ativa alertas, insights e relatórios IFJ — o próximo passo para decisões clínicas mais rápidas e precisas.",
      confidence: Math.min(score + 10, 88),
      eligibleTiers: ["basic", "pro"],
    };
  }

  return {
    suggested: "basic",
    reason:
      "O modo Básico mantém sua interface limpa e focada no essencial enquanto você constrói sua carteira. Conforme evoluir, a IFJ sugerirá o momento ideal para avançar.",
    confidence: Math.max(60, 100 - score),
    eligibleTiers: ["basic"],
  };
}

// ── Main ──

async function computeRecommendation(
  userId: string
): Promise<Omit<ModeRecommendation, "loading">> {
  const factors = await fetchCounts(userId);
  const score = computeScore(factors);
  const { suggested, reason, confidence, eligibleTiers } = classify(score, factors);

  // Registrar evento IFJ (fire and forget)
  supabase
    .from("ai_usage_tracking")
    .insert({
      user_id: userId,
      feature_key: "ifj_experience_mode_recommendation",
      metadata: { suggested, score, factors, engine: "v2" } as any,
    })
    .then(() => {});

  return { suggested, reason, confidence, factors, eligibleTiers };
}
