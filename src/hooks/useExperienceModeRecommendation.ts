import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { ExperienceMode } from "@/hooks/useExperienceMode";

export interface ModeRecommendation {
  suggested: ExperienceMode;
  reason: string;
  confidence: number; // 0-100
  factors: {
    patientCount: number;
    daysSinceSignup: number;
    featuresUsed: number;
    recentSessionCount: number;
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
    factors: { patientCount: 0, daysSinceSignup: 0, featuresUsed: 0, recentSessionCount: 0 },
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
        localStorage.setItem(RECOMMENDATION_CACHE_KEY, JSON.stringify({ data: rec, ts: Date.now() }));
      } catch {}
    });
  }, [user]);

  return result;
}

async function computeRecommendation(userId: string): Promise<Omit<ModeRecommendation, "loading">> {
  const [patientsRes, profileRes, aiUsageRes, automationRes] = await Promise.all([
    supabase.from("nutritionist_patients").select("id", { count: "exact", head: true }).eq("nutritionist_id", userId),
    supabase.from("profiles").select("created_at").eq("id", userId).single(),
    supabase.from("ai_usage_tracking").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("automation_rules").select("id", { count: "exact", head: true }).eq("nutritionist_id", userId),
  ]);

  const patientCount = patientsRes.count ?? 0;
  const daysSinceSignup = profileRes.data?.created_at
    ? Math.floor((Date.now() - new Date(profileRes.data.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const featuresUsed = (aiUsageRes.count ?? 0) + (automationRes.count ?? 0);
  // Approximate session count from recent AI usage as proxy
  const recentSessionCount = aiUsageRes.count ?? 0;

  const factors = { patientCount, daysSinceSignup, featuresUsed, recentSessionCount };

  // Scoring
  let score = 0;

  // Patient volume
  if (patientCount >= 30) score += 40;
  else if (patientCount >= 10) score += 25;
  else if (patientCount >= 3) score += 10;

  // Platform tenure
  if (daysSinceSignup >= 90) score += 20;
  else if (daysSinceSignup >= 30) score += 12;
  else if (daysSinceSignup >= 7) score += 5;

  // Feature breadth
  if (featuresUsed >= 20) score += 25;
  else if (featuresUsed >= 5) score += 15;
  else if (featuresUsed >= 1) score += 5;

  // Automation usage (strong advanced signal)
  if ((automationRes.count ?? 0) >= 3) score += 15;
  else if ((automationRes.count ?? 0) >= 1) score += 8;

  let suggested: ExperienceMode;
  let reason: string;
  let confidence: number;

  if (score >= 70) {
    suggested = "advanced";
    reason = "Você já usa automações e gerencia muitos pacientes — o modo Avançado libera todo o potencial do IFJ.";
    confidence = Math.min(score, 95);
  } else if (score >= 30) {
    suggested = "pro";
    reason = "Com sua base de pacientes e uso atual, o modo Profissional equilibra simplicidade e poder clínico.";
    confidence = Math.min(score + 10, 85);
  } else {
    suggested = "basic";
    reason = "O modo Básico mantém a interface limpa enquanto você conhece a plataforma.";
    confidence = Math.max(60, 100 - score);
  }

  // Save for analytics (fire and forget)
  supabase.from("ai_usage_tracking").insert({
    user_id: userId,
    feature_key: "experience_mode_recommendation",
    metadata: { suggested, score, factors } as any,
  }).then(() => {});

  return { suggested, reason, confidence, factors };
}
