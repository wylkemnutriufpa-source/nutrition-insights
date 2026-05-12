/**
 * FitJourney Intelligence — Context Builder
 * 
 * Consolidates all patient data needed by the prompt engine
 * into a single typed context object.
 */
import { supabase } from "@v1/integrations/supabase/client";

export interface FitIntelligenceContext {
  patientId: string;
  firstName: string;
  enabled: boolean;
  onboarded: boolean;
  snoozedUntil: Date | null;
  waterTarget: number;
  waterConsumed: number;
  hydrationRemaining: number;
  motivationStyle: "gentle" | "firm";
  messageTone: "funny" | "direct";
  workoutTime: string;
  workoutBlocker: string | null;
  trainsAlone: boolean;
  forgetsWater: boolean;
  weekendDietBreaks: boolean;
  cravingHours: string[];
  preferredReminderWindows: number[];
  clinicalFlags: string[];
  allergies: string[];
  intolerances: string[];
  isWeekend: boolean;
  currentHour: number;
  ignoredCount: number;
  engagedCount: number;
  lastPromptAt: Date | null;
  lastPromptType: string | null;
  cooldownMinutes: number;
  failureCount7d: number;
}

/**
 * Builds the full intelligence context for a patient.
 * All queries run in parallel for performance.
 */
export async function buildIntelligenceContext(
  userId: string,
  fullName: string,
  profileData: Record<string, any>
): Promise<FitIntelligenceContext | null> {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  // Run all queries in parallel
  const [bpRes, freqRes, hydRes, flagsRes, recentHydRes] = await Promise.all([
    supabase
      .from("behavioral_profile" as any)
      .select("*")
      .eq("patient_id", userId)
      .maybeSingle(),
    supabase
      .from("fit_intelligence_frequency" as any)
      .select("*")
      .eq("patient_id", userId)
      .maybeSingle(),
    supabase
      .from("fit_intelligence_hydration" as any)
      .select("*")
      .eq("patient_id", userId)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("patient_clinical_flags" as any)
      .select("flag_key")
      .eq("patient_id", userId)
      .eq("is_active", true),
    supabase
      .from("fit_intelligence_hydration" as any)
      .select("consumed_cups, target_cups")
      .eq("patient_id", userId)
      .gte("date", weekAgo),
  ]);

  const bp = bpRes.data as any;
  if (!bp) return null;

  const freq = freqRes.data as any;
  const hyd = hydRes.data as any;
  const flags = (flagsRes.data || []) as any[];
  const recentHyd = (recentHydRes.data || []) as any[];

  const failureCount7d = recentHyd.filter(
    (h) => h.target_cups > 0 && h.consumed_cups < h.target_cups * 0.5
  ).length;

  const now = new Date();
  const waterTarget = hyd?.target_cups || Math.ceil((bp.water_cups_per_day || 6) * 1.5);
  const waterConsumed = hyd?.consumed_cups || 0;

  const allFlags = flags.map((f) => f.flag_key);
  const snoozedRaw = profileData.fit_intelligence_snoozed_until;

  return {
    patientId: userId,
    firstName: fullName?.split(" ")[0] || "você",
    enabled: profileData.fit_intelligence_enabled === true,
    onboarded: profileData.fit_intelligence_onboarded === true,
    snoozedUntil: snoozedRaw ? new Date(snoozedRaw) : null,
    waterTarget,
    waterConsumed,
    hydrationRemaining: Math.max(0, waterTarget - waterConsumed),
    motivationStyle: bp.motivation_style || "gentle",
    messageTone: bp.message_tone || "funny",
    workoutTime: bp.workout_time || "morning",
    workoutBlocker: bp.workout_blocker || null,
    trainsAlone: bp.trains_alone ?? true,
    forgetsWater: bp.forgets_water ?? false,
    weekendDietBreaks: bp.weekend_diet_breaks ?? false,
    cravingHours: bp.craving_hours || [],
    preferredReminderWindows: bp.preferred_reminder_windows || [9, 12, 15, 18],
    clinicalFlags: allFlags,
    allergies: allFlags.filter((f: string) => f.includes("alergia")),
    intolerances: allFlags.filter((f: string) => f.includes("intolerancia") || f.includes("lactose") || f.includes("gluten")),
    isWeekend: [0, 6].includes(now.getDay()),
    currentHour: now.getHours(),
    ignoredCount: freq?.ignored_count || 0,
    engagedCount: freq?.engaged_count || 0,
    lastPromptAt: freq?.last_prompt_at ? new Date(freq.last_prompt_at) : null,
    lastPromptType: freq?.last_prompt_type || null,
    cooldownMinutes: freq?.cooldown_minutes || 120,
    failureCount7d,
  };
}
