import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TriggerMap {
  id: string;
  question_key: string;
  answer_condition: {
    operator: string;
    value?: any;
    values?: any[];
  };
  generated_flag: string;
  priority: number;
}

/**
 * Evaluates a single trigger condition against an answer value.
 */
function evaluateCondition(
  condition: TriggerMap["answer_condition"],
  answerValue: any
): boolean {
  if (answerValue === undefined || answerValue === null) return false;

  const { operator, value, values } = condition;

  switch (operator) {
    case "equals":
      return String(answerValue) === String(value);

    case "not_equals":
      return String(answerValue) !== String(value);

    case "greater_than":
      return Number(answerValue) > Number(value);

    case "less_than":
      return Number(answerValue) < Number(value);

    case "greater_or_equal":
      return Number(answerValue) >= Number(value);

    case "less_or_equal":
      return Number(answerValue) <= Number(value);

    case "includes":
      if (Array.isArray(answerValue)) return answerValue.includes(value);
      return String(answerValue).toLowerCase().includes(String(value).toLowerCase());

    case "includes_any":
      if (!values || !Array.isArray(values)) return false;
      if (Array.isArray(answerValue)) {
        return values.some((v) => answerValue.includes(v));
      }
      const lower = String(answerValue).toLowerCase();
      return values.some((v) => lower.includes(String(v).toLowerCase()));

    case "not_includes":
      if (Array.isArray(answerValue)) return !answerValue.includes(value);
      return !String(answerValue).toLowerCase().includes(String(value).toLowerCase());

    case "is_true":
      return answerValue === true || answerValue === "true" || answerValue === "yes";

    case "is_false":
      return answerValue === false || answerValue === "false" || answerValue === "no";

    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { patient_id, anamnesis_id } = await req.json();

    if (!patient_id) {
      return new Response(
        JSON.stringify({ error: "patient_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Load anamnesis answers
    let answers: Record<string, any> = {};
    if (anamnesis_id) {
      const { data } = await supabase
        .from("patient_anamnesis")
        .select("answers")
        .eq("id", anamnesis_id)
        .single();
      answers = (data?.answers as Record<string, any>) || {};
    } else {
      const { data } = await supabase
        .from("patient_anamnesis")
        .select("answers")
        .eq("user_id", patient_id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      answers = (data?.answers as Record<string, any>) || {};
    }

    if (Object.keys(answers).length === 0) {
      return new Response(
        JSON.stringify({ patient_id, flags_generated: 0, flags: [], message: "No answers found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Load active trigger mappings
    const { data: triggers } = await supabase
      .from("anamnese_trigger_map")
      .select("id, question_key, answer_condition, generated_flag, priority")
      .eq("is_active", true);

    const triggerList: TriggerMap[] = (triggers || []) as TriggerMap[];

    // 3. Evaluate each trigger against answers
    const matchedFlags: Array<{
      flag_key: string;
      source_answer_key: string;
      source_answer_value: any;
      confidence: number;
    }> = [];

    for (const trigger of triggerList) {
      const answerValue = answers[trigger.question_key];
      const condition = trigger.answer_condition as TriggerMap["answer_condition"];

      if (evaluateCondition(condition, answerValue)) {
        // Confidence based on priority: 1=0.6, 2=0.7, 3=0.8, 4=0.9, 5=1.0
        const confidence = Math.min(1.0, 0.5 + trigger.priority * 0.1);

        matchedFlags.push({
          flag_key: trigger.generated_flag,
          source_answer_key: trigger.question_key,
          source_answer_value: answerValue,
          confidence,
        });
      }
    }

    // 4. Also detect flags from adaptive block answers (clinical_history text, etc.)
    const textFields = ["clinical_history", "health_conditions", "symptoms"];
    const textBasedDetections: Record<string, string[]> = {
      has_gastritis: ["gastrite"],
      has_reflux: ["refluxo"],
      has_constipation: ["constipação", "constipacao", "intestino preso"],
      lactose_intolerance: ["lactose", "intolerância à lactose"],
      gluten_sensitivity: ["glúten", "gluten", "celíac"],
      suspected_insulin_resistance: ["resistência insulínica", "resistencia insulinica", "insulina"],
    };

    for (const field of textFields) {
      const val = answers[field];
      if (!val) continue;

      const text = Array.isArray(val) ? val.join(" ") : String(val);
      const lower = text.toLowerCase();

      for (const [flagKey, keywords] of Object.entries(textBasedDetections)) {
        if (keywords.some((kw) => lower.includes(kw))) {
          if (!matchedFlags.find((f) => f.flag_key === flagKey)) {
            matchedFlags.push({
              flag_key: flagKey,
              source_answer_key: field,
              source_answer_value: val,
              confidence: 0.7,
            });
          }
        }
      }
    }

    // 5. Deduplicate by flag_key (keep highest confidence)
    const flagMap = new Map<string, typeof matchedFlags[0]>();
    for (const flag of matchedFlags) {
      const existing = flagMap.get(flag.flag_key);
      if (!existing || flag.confidence > existing.confidence) {
        flagMap.set(flag.flag_key, flag);
      }
    }

    const uniqueFlags = Array.from(flagMap.values());

    // 6. Upsert into patient_clinical_flags
    // First deactivate all anamnese-sourced flags for this patient
    await supabase
      .from("patient_clinical_flags")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("patient_id", patient_id)
      .eq("source", "anamnese");

    // Then upsert active flags
    if (uniqueFlags.length > 0) {
      const rows = uniqueFlags.map((f) => ({
        patient_id,
        flag_key: f.flag_key,
        source: "anamnese",
        confidence: f.confidence,
        is_active: true,
        source_answer_key: f.source_answer_key,
        source_answer_value: f.source_answer_value,
        updated_at: new Date().toISOString(),
      }));

      await supabase
        .from("patient_clinical_flags")
        .upsert(rows, { onConflict: "patient_id,flag_key" });
    }

    // 7. Return summary
    return new Response(
      JSON.stringify({
        patient_id,
        flags_generated: uniqueFlags.length,
        flags: uniqueFlags.map((f) => ({
          flag_key: f.flag_key,
          confidence: f.confidence,
          source_key: f.source_answer_key,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Flag processing error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
