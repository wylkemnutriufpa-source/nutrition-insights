/**
 * Patient Meal Schedule Resolver — FitJourney Engine v1.0
 * 
 * Resolves patient meal schedules with intelligent defaults.
 * If patient hasn't filled schedules or filled incorrectly,
 * the system falls back to safe defaults instead of breaking.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Default Schedule (Brazilian standard) ────────────────────
export const DEFAULT_MEAL_SCHEDULE: Record<string, string> = {
  breakfast: "07:00",
  morning_snack: "09:30",
  lunch: "12:00",
  afternoon_snack: "15:30",
  dinner: "19:00",
  evening_snack: "21:00",
};

// ── Wake/sleep-based schedule calculation ────────────────────
function buildScheduleFromWakeSleep(wakeTime: string, sleepTime: string): Record<string, string> {
  const [wh, wm] = wakeTime.split(":").map(Number);
  const [sh, sm] = sleepTime.split(":").map(Number);

  if (isNaN(wh) || isNaN(wm) || isNaN(sh) || isNaN(sm)) {
    return { ...DEFAULT_MEAL_SCHEDULE };
  }

  let wakeMin = wh * 60 + wm;
  let sleepMin = sh * 60 + sm;
  if (sleepMin <= wakeMin) sleepMin += 24 * 60;

  const awakeMinutes = sleepMin - wakeMin;

  // Need at least 10 hours awake for 6 meals
  if (awakeMinutes < 600) {
    return { ...DEFAULT_MEAL_SCHEDULE };
  }

  const toTime = (minutes: number): string => {
    const m = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  };

  // Distribute meals proportionally across waking hours
  const breakfast = wakeMin + 30; // 30min after wake
  const eveningSnack = sleepMin - 60; // 1h before sleep
  const remaining = eveningSnack - breakfast;

  return {
    breakfast: toTime(breakfast),
    morning_snack: toTime(breakfast + remaining * 0.15),
    lunch: toTime(breakfast + remaining * 0.35),
    afternoon_snack: toTime(breakfast + remaining * 0.55),
    dinner: toTime(breakfast + remaining * 0.78),
    evening_snack: toTime(eveningSnack),
  };
}

// ── Validation: detect all-same-time or garbage schedules ────
function isValidSchedule(schedule: Record<string, string>): boolean {
  const times = Object.values(schedule).filter(Boolean);
  if (times.length < 3) return false;

  // Check if all times are the same (broken fill)
  const unique = new Set(times);
  if (unique.size <= 1) return false;

  // Check if times are parseable
  for (const t of times) {
    const parts = t.split(":");
    if (parts.length < 2) return false;
    const [h, m] = parts.map(Number);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return false;
  }

  // Check chronological order (at least roughly)
  const minutes = times.map(t => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  });
  let outOfOrder = 0;
  for (let i = 1; i < minutes.length; i++) {
    if (minutes[i] <= minutes[i - 1]) outOfOrder++;
  }
  // Allow 1 out-of-order (flexible) but not all jumbled
  if (outOfOrder > 2) return false;

  return true;
}

// ── Main resolver ────────────────────────────────────────────
export interface ResolvedSchedule {
  schedule: Record<string, string>;
  source: "patient_preferences" | "anamnesis_wake_sleep" | "behavioral_profile" | "default";
  wasResolved: boolean;
  warnings: string[];
}

export async function resolvePatientSchedule(patientId: string): Promise<ResolvedSchedule> {
  const warnings: string[] = [];

  try {
    // 1. Try patient_anamnesis answers (wake_time, sleep_time, meal_times)
    const { data: anamnesis } = await supabase
      .from("patient_anamnesis")
      .select("answers")
      .eq("user_id", patientId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anamnesis?.answers && typeof anamnesis.answers === "object") {
      const ans = anamnesis.answers as Record<string, any>;

      // Check if patient provided explicit meal times
      const mealTimes = ans.meal_times || ans.horarios_refeicoes || ans.meal_schedule;
      if (mealTimes && typeof mealTimes === "object") {
        const schedule: Record<string, string> = {};
        for (const [key, val] of Object.entries(mealTimes)) {
          if (typeof val === "string" && val.includes(":")) {
            const normalizedKey = normalizeMealKey(key);
            if (normalizedKey) schedule[normalizedKey] = val;
          }
        }
        if (isValidSchedule(schedule)) {
          return { schedule: fillMissingSlots(schedule), source: "patient_preferences", wasResolved: true, warnings };
        }
        warnings.push("Horários preenchidos pelo paciente são inválidos — usando fallback");
      }

      // Try wake/sleep times from anamnesis
      const wakeTime = ans.wake_time || ans.horario_acordar || ans.hora_acordar;
      const sleepTime = ans.sleep_time || ans.horario_dormir || ans.hora_dormir;
      if (wakeTime && sleepTime) {
        const schedule = buildScheduleFromWakeSleep(String(wakeTime), String(sleepTime));
        if (isValidSchedule(schedule)) {
          return { schedule, source: "anamnesis_wake_sleep", wasResolved: true, warnings };
        }
      }
    }

    // 2. Try behavioral_profile
    const { data: behavioral } = await supabase
      .from("behavioral_profile")
      .select("wake_up_time, preferred_reminder_windows")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (behavioral?.wake_up_time) {
      // Estimate sleep time as wake + 16h
      const [wh] = behavioral.wake_up_time.split(":").map(Number);
      const estimatedSleep = `${((wh + 16) % 24).toString().padStart(2, "0")}:00`;
      const schedule = buildScheduleFromWakeSleep(behavioral.wake_up_time, estimatedSleep);
      if (isValidSchedule(schedule)) {
        return { schedule, source: "behavioral_profile", wasResolved: true, warnings };
      }
    }

    // 3. Try onboarding pipeline
    try {
      const { data: pipeline } = await supabase
        .from("patient_onboarding_pipeline" as any)
        .select("wake_time, sleep_time")
        .eq("patient_id", patientId)
        .maybeSingle();

      const pipelineData = pipeline as any;
      if (pipelineData?.wake_time && pipelineData?.sleep_time) {
        const schedule = buildScheduleFromWakeSleep(pipelineData.wake_time, pipelineData.sleep_time);
        if (isValidSchedule(schedule)) {
          return { schedule, source: "patient_preferences", wasResolved: true, warnings };
        }
      }
    } catch { /* table may not exist */ }
  } catch (e) {
    console.warn("[ScheduleResolver] Error loading patient data:", e);
  }

  // 4. Fallback to safe defaults
  warnings.push("Paciente não preencheu horários — horário padrão aplicado (café 07h, almoço 12h, jantar 19h)");
  return {
    schedule: { ...DEFAULT_MEAL_SCHEDULE },
    source: "default",
    wasResolved: false,
    warnings,
  };
}

// ── Helpers ──────────────────────────────────────────────────
function normalizeMealKey(key: string): string | null {
  const k = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const map: Record<string, string> = {
    cafe: "Café da Manhã", "cafe_da_manha": "Café da Manhã", breakfast: "Café da Manhã", desjejum: "Café da Manhã",
    lanche_manha: "Lanche da Manhã", morning_snack: "Lanche da Manhã", "lanche da manha": "Lanche da Manhã",
    almoco: "Almoço", lunch: "Almoço",
    lanche_tarde: "Lanche da Tarde", afternoon_snack: "Lanche da Tarde", "lanche da tarde": "Lanche da Tarde",
    jantar: "Jantar", dinner: "Jantar",
    ceia: "Ceia", evening_snack: "Ceia", "lanche noturno": "Ceia",
  };
  return map[k] || null;
}

function fillMissingSlots(partial: Record<string, string>): Record<string, string> {
  const result = { ...DEFAULT_MEAL_SCHEDULE };
  for (const [key, val] of Object.entries(partial)) {
    if (val) result[key] = val;
  }
  return result;
}
