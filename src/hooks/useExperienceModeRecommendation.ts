import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { ExperienceMode } from "@/hooks/useExperienceMode";

/**
 * IFJ Experience Mode Recommendation Engine
 * 
 * Motor determinístico que analisa sinais reais de uso do produto
 * para sugerir o nível de experiência ideal para o profissional.
 * 
 * Sinais avaliados:
 *  - Pacientes ativos vinculados
 *  - Planos alimentares criados/publicados
 *  - Protocolos clínicos ativos
 *  - Alertas clínicos revisados (resolvidos)
 *  - Automações criadas
 *  - Tempo desde cadastro (maturidade)
 */

export interface ModeRecommendation {
  suggested: ExperienceMode;
  reason: string;
  confidence: number; // 0-100
  factors: {
    activePatients: number;
    mealPlansCreated: number;
    protocolsUsed: number;
    alertsReviewed: number;
    automationsCreated: number;
    daysSinceSignup: number;
  };
  loading: boolean;
}

const RECOMMENDATION_CACHE_KEY = "fj_mode_recommendation";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function useExperienceModeRecommendation(): ModeRecommendation {
  const { user } = useAuth();
  const [result, setResult] = useState<ModeRecommendation>({
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
    },
    loading: true,
  });

  useEffect(() => {
    if (!user) return;

    // Check cache
    try {
      const cached = localStorage.getItem(RECOMMENDATION_CACHE_KEY);
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
        localStorage.setItem(
          RECOMMENDATION_CACHE_KEY,
          JSON.stringify({ data: rec, ts: Date.now() })
        );
      } catch {}
    });
  }, [user]);

  return result;
}

async function computeRecommendation(
  userId: string
): Promise<Omit<ModeRecommendation, "loading">> {
  // Fetch real product signals in parallel
  const [
    patientsRes,
    profileRes,
    mealPlansRes,
    protocolsRes,
    alertsReviewedRes,
    automationRes,
  ] = await Promise.all([
    // Pacientes ativos vinculados
    supabase
      .from("nutritionist_patients")
      .select("id", { count: "exact", head: true })
      .eq("nutritionist_id", userId),
    // Profile — usar user_id (auth.uid() = profiles.user_id, NÃO profiles.id)
    supabase
      .from("profiles")
      .select("created_at")
      .eq("user_id", userId)
      .single(),
    // Planos alimentares criados
    supabase
      .from("meal_plans")
      .select("id", { count: "exact", head: true })
      .eq("nutritionist_id", userId),
    // Protocolos clínicos usados (atribuídos a pacientes)
    supabase
      .from("patient_protocols")
      .select("id", { count: "exact", head: true })
      .eq("nutritionist_id", userId),
    // Alertas clínicos revisados/resolvidos
    supabase
      .from("clinical_alerts")
      .select("id", { count: "exact", head: true })
      .eq("nutritionist_id", userId)
      .eq("is_active", false),
    // Automações criadas
    supabase
      .from("automation_rules")
      .select("id", { count: "exact", head: true })
      .eq("nutritionist_id", userId),
  ]);

  const activePatients = patientsRes.count ?? 0;
  const mealPlansCreated = mealPlansRes.count ?? 0;
  const protocolsUsed = protocolsRes.count ?? 0;
  const alertsReviewed = alertsReviewedRes.count ?? 0;
  const automationsCreated = automationRes.count ?? 0;
  const daysSinceSignup = profileRes.data?.created_at
    ? Math.floor(
        (Date.now() - new Date(profileRes.data.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  const factors = {
    activePatients,
    mealPlansCreated,
    protocolsUsed,
    alertsReviewed,
    automationsCreated,
    daysSinceSignup,
  };

  // ── IFJ Scoring Engine ──
  // Cada sinal contribui com peso proporcional à maturidade clínica
  let score = 0;

  // 1. Volume de pacientes (peso máx: 30)
  if (activePatients >= 30) score += 30;
  else if (activePatients >= 15) score += 22;
  else if (activePatients >= 5) score += 12;
  else if (activePatients >= 1) score += 5;

  // 2. Planos alimentares criados (peso máx: 20)
  if (mealPlansCreated >= 20) score += 20;
  else if (mealPlansCreated >= 10) score += 14;
  else if (mealPlansCreated >= 3) score += 8;
  else if (mealPlansCreated >= 1) score += 3;

  // 3. Protocolos clínicos usados (peso máx: 15)
  if (protocolsUsed >= 10) score += 15;
  else if (protocolsUsed >= 3) score += 10;
  else if (protocolsUsed >= 1) score += 5;

  // 4. Alertas clínicos revisados — sinal de engajamento com IFJ (peso máx: 10)
  if (alertsReviewed >= 10) score += 10;
  else if (alertsReviewed >= 3) score += 6;
  else if (alertsReviewed >= 1) score += 3;

  // 5. Automações — sinal forte de uso avançado (peso máx: 15)
  if (automationsCreated >= 5) score += 15;
  else if (automationsCreated >= 2) score += 10;
  else if (automationsCreated >= 1) score += 5;

  // 6. Maturidade na plataforma (peso máx: 10)
  if (daysSinceSignup >= 90) score += 10;
  else if (daysSinceSignup >= 30) score += 6;
  else if (daysSinceSignup >= 7) score += 3;

  // ── Classificação ──
  let suggested: ExperienceMode;
  let reason: string;
  let confidence: number;

  if (score >= 65) {
    suggested = "advanced";
    reason =
      "Você gerencia muitos pacientes, usa protocolos e automações — o modo Avançado libera todo o potencial da IFJ.";
    confidence = Math.min(score, 95);
  } else if (score >= 30) {
    suggested = "pro";
    reason =
      "Com sua base de pacientes e planos criados, o modo Profissional equilibra simplicidade e inteligência clínica.";
    confidence = Math.min(score + 10, 85);
  } else {
    suggested = "basic";
    reason =
      "O modo Básico mantém a interface limpa enquanto você conhece a plataforma.";
    confidence = Math.max(60, 100 - score);
  }

  // Registrar evento IFJ (fire and forget) — nomenclatura IFJ, não genérica
  supabase
    .from("ai_usage_tracking")
    .insert({
      user_id: userId,
      feature_key: "ifj_experience_mode_recommendation",
      metadata: { suggested, score, factors } as any,
    })
    .then(() => {});

  return { suggested, reason, confidence, factors };
}
