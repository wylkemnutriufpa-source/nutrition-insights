import { supabase } from "@v1/integrations/supabase/client";

export interface DetectedSignal {
  signal_key: string;
  severity: string;
  value: number | null;
}

export interface ClinicalRecommendation {
  title: string;
  body: string;
  icon: string;
  priority: string;
  action_type: string | null;
  action_route: string | null;
}

export interface MatchedRule {
  rule_key: string;
  rule_name: string;
  category: string;
  priority: number;
  score: number;
  target_audience: string;
  matched_signals: string[];
  recommendations: ClinicalRecommendation[];
}

export interface MatchedTip {
  tip_key: string;
  content: string;
  icon: string;
  category: string;
  severity: string;
}

export interface ClinicalEngineResult {
  patient_id: string;
  total_signals: number;
  matched_rules: number;
  matched_tips: number;
  rules: MatchedRule[];
  tips: MatchedTip[];
  signals_summary: DetectedSignal[];
}

export interface SignalDetectionResult {
  patient_id: string;
  signals_detected: number;
  signals: DetectedSignal[];
}

/**
 * Detect patient signals from platform data (deterministic, no AI)
 */
export async function detectPatientSignals(
  patientId: string
): Promise<SignalDetectionResult> {
  const { data, error } = await supabase.functions.invoke(
    "detect-patient-signals",
    { body: { patient_id: patientId } }
  );

  if (error) throw new Error(error.message);
  return data as SignalDetectionResult;
}

/**
 * Run the clinical rule engine against detected signals (deterministic, no AI)
 */
export async function runClinicalEngine(
  patientId: string,
  patientName?: string,
  audience?: "nutritionist" | "patient"
): Promise<ClinicalEngineResult> {
  const { data, error } = await supabase.functions.invoke(
    "clinical-rule-engine",
    {
      body: {
        patient_id: patientId,
        patient_name: patientName,
        audience,
      },
    }
  );

  if (error) throw new Error(error.message);
  return data as ClinicalEngineResult;
}

/**
 * Full pipeline: detect signals then run rules (two-step deterministic analysis)
 */
export async function runFullClinicalAnalysis(
  patientId: string,
  patientName?: string,
  audience?: "nutritionist" | "patient"
): Promise<ClinicalEngineResult> {
  // Step 1: Detect fresh signals
  await detectPatientSignals(patientId);

  // Step 2: Run rule engine against detected signals
  return runClinicalEngine(patientId, patientName, audience);
}

/**
 * Get cached signals for a patient (no re-detection)
 */
export async function getActiveSignals(
  patientId: string
): Promise<DetectedSignal[]> {
  const { data, error } = await supabase
    .from("patient_signals")
    .select("signal_key, severity, value")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .order("detected_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as DetectedSignal[];
}

/**
 * Get severity color for UI rendering
 */
export function getSeverityColor(severity: string): {
  text: string;
  bg: string;
  border: string;
} {
  switch (severity) {
    case "critical":
      return {
        text: "text-destructive",
        bg: "bg-destructive/10",
        border: "border-destructive/20",
      };
    case "high":
      return {
        text: "text-warning",
        bg: "bg-warning/10",
        border: "border-warning/20",
      };
    case "medium":
      return {
        text: "text-accent",
        bg: "bg-accent/10",
        border: "border-accent/20",
      };
    case "info":
      return {
        text: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/20",
      };
    default:
      return {
        text: "text-muted-foreground",
        bg: "bg-muted",
        border: "border-border",
      };
  }
}

/**
 * Get priority color for recommendations
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "high":
      return "text-destructive";
    case "medium":
      return "text-warning";
    case "low":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
}
