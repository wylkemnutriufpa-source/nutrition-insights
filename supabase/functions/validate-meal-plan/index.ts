import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateBody } from "../_shared/validator.ts";
import { ValidateMealPlanSchema } from "../_shared/schemas.ts";
import {
  BLOCKED_FOODS as CANONICAL_BLOCKED_FOODS,
  REPLACEMENTS as CANONICAL_REPLACEMENTS,
  PREMIUM_KEYWORDS as CANONICAL_PREMIUM_KEYWORDS,
  COMPLEX_PREP_KEYWORDS as CANONICAL_COMPLEX_PREP_KEYWORDS,
} from "../_shared/food-rules.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Clinical Tolerance Matrix ─────────────────────────────────────────────────
const TOLERANCE = {
    calories: 0.05,
    protein: 0.05,
    carbs: 0.10,
    fat: 0.10,
};

// ── Blocked Foods ─────────────────────────────────────────────────────────────
const BLOCKED_FOODS = CANONICAL_BLOCKED_FOODS;

// ── Brazilian Replacements ────────────────────────────────────────────────────
const REPLACEMENTS = CANONICAL_REPLACEMENTS;

// ── Premium / Complex keywords ────────────────────────────────────────────────
const PREMIUM_KEYWORDS = CANONICAL_PREMIUM_KEYWORDS;
const COMPLEX_PREP_KEYWORDS = CANONICAL_COMPLEX_PREP_KEYWORDS;

// ── Brazilian base foods for main meals ───────────────────────────────────────
const BRAZILIAN_PROTEINS = ["frango", "carne", "peixe", "tilápia", "sardinha", "ovo", "omelete", "porco", "bife", "filé", "linguiça", "charque", "jabá", "atum", "merluza", "sobrecoxa", "alcatra", "patinho", "acém", "carne moída", "carne moida"];
const BRAZILIAN_CARBS = ["arroz", "macarrão", "batata", "batata doce", "macaxeira", "purê", "cuscuz", "feijão", "tapioca", "inhame", "aipim", "mandioca", "farinha", "farofa", "milho", "açaí", "aveia", "pão", "pao", "torrada", "espaguete", "lentilha", "grão de bico", "grao de bico"];
const ALLOWED_FRUITS = ["banana", "maçã", "mamão", "melão", "manga", "abacaxi", "laranja", "morango", "uva", "melancia", "goiaba", "acerola", "pera", "tangerina"];

function normalize(text: string): string {
    return text.replace(/\[[\w\sáàãâéêíóôõúç:→×.,\-\/]+\]/gi, "")
        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function splitPrimaryDescription(raw: string): { primary: string; substitutions: string } {
    const lines = (raw || "").split("\n");
    const primaryLines: string[] = [];
    const substitutionLines: string[] = [];
    let inSubstitutions = false;

    for (const line of lines) {
        const n = normalize(line);
        if (n.includes("substituic") || n.includes("substitui") || line.includes("🔄")) {
            inSubstitutions = true;
            continue;
        }

        if (inSubstitutions) substitutionLines.push(line);
        else primaryLines.push(line);
    }

    return {
        primary: primaryLines.join("\n"),
        substitutions: substitutionLines.join("\n"),
    };
}

function getPrimaryMealText(item: any): string {
    const description = splitPrimaryDescription(item.description || "").primary;
    return normalize(`${item.title || ""} ${description || ""}`);
}

function findBlockedFoods(text: string): string[] {
    const n = normalize(text);
    return BLOCKED_FOODS.filter(blocked => n.includes(normalize(blocked)));
}

type MacroKey = keyof typeof TOLERANCE;

interface MacroResult {
    label: string; unit: string; target: number; actual: number;
    diff_pct: number; tolerance: number; passed: boolean; rule: string;
}

function checkMacro(label: string, unit: string, target: number, actual: number, key: MacroKey): MacroResult {
    if (!target || target === 0) {
        return { label, unit, target: 0, actual, diff_pct: 0, tolerance: TOLERANCE[key], passed: true, rule: "sem_meta" };
    }
    const diff_pct = ((actual - target) / target);
    const passed = Math.abs(diff_pct) <= TOLERANCE[key];
    return {
        label, unit,
        target: Math.round(target), actual: Math.round(actual),
        diff_pct: Math.round(diff_pct * 1000) / 10,
        tolerance: TOLERANCE[key] * 100,
        passed,
        rule: `tolerância clínica ±${TOLERANCE[key] * 100}%`,
    };
}

interface SimplicityIssue {
    category: "critical" | "adherence" | "suggestion";
    severity: "critical" | "high" | "medium" | "low";
    tipo_refeicao: string;
    day: number;
    message: string;
    suggested_fix: string;
    penalty: number;
}

function analyzePlanSimplicity(items: any[], goal: string): { score: number; status: string; issues: SimplicityIssue[]; blocked_foods: Array<{ food: string; found_in: string; day: number; tipo_refeicao: string; replacement: string | null }> } {
    let score = 100;
    const issues: SimplicityIssue[] = [];
    const blockedFoods: Array<{ food: string; found_in: string; day: number; tipo_refeicao: string; replacement: string | null }> = [];
    const isMassGain = ["muscle_gain", "ganho_de_massa", "mass", "bulking", "performance"].includes(normalize(goal));

    const groups = new Map<string, any[]>();
    for (const item of items) {
        const k = `${item.day_of_week ?? 0}_${item.tipo_refeicao}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(item);
    }

    const penalizedKeys = new Set<string>();

    for (const item of items) {
        const desc = getPrimaryMealText(item);
        const found = findBlockedFoods(desc);
        for (const food of found) {
            const dedupKey = `blocked_${normalize(food)}_${item.day_of_week ?? 0}_${item.tipo_refeicao}`;
            if (penalizedKeys.has(dedupKey)) continue;
            penalizedKeys.add(dedupKey);

            const nf = normalize(food);
            const replacement = REPLACEMENTS[nf] || REPLACEMENTS[food] || null;
            blockedFoods.push({
                food,
                found_in: item.title || item.tipo_refeicao,
                day: item.day_of_week ?? 0,
                tipo_refeicao: item.tipo_refeicao,
                replacement,
            });
            score -= 20;
            issues.push({
                category: "critical",
                severity: "critical",
                tipo_refeicao: item.tipo_refeicao,
                day: item.day_of_week ?? 0,
                message: `Alimento bloqueado: "${food}"`,
                suggested_fix: replacement ? `Trocar por: ${replacement}` : `Remover "${food}"`,
                penalty: 20,
            });
        }
    }

    const uniqueBlocked = blockedFoods.filter((item, idx, arr) =>
        arr.findIndex(x => x.food === item.food && x.day === item.day && x.tipo_refeicao === item.tipo_refeicao) === idx
    );

    for (const [key, mealItems] of groups.entries()) {
        const [dayStr, ...mealParts] = key.split("_");
        const mealType = mealParts.join("_");
        const day = parseInt(dayStr);

        if (mealItems.length > 5) {
            score -= 10;
            issues.push({
                category: "adherence", severity: "high", tipo_refeicao: mealType, day,
                message: `Refeição com ${mealItems.length} itens (máx 5)`,
                suggested_fix: "Reduzir para no máximo 5 itens",
                penalty: 10,
            });
        }

        // New validation: Reject plans with > 4 equivalent substitutions per meal
        for (const item of mealItems) {
            const meta = item.edit_metadata || item.metadata || {};
            const substitutions = meta.substitutions_json;
            if (Array.isArray(substitutions) && substitutions.length > 4) {
                score -= 25;
                issues.push({
                    category: "critical",
                    severity: "critical",
                    tipo_refeicao: mealType,
                    day: item.day_of_week ?? 0,
                    message: `Refeição "${item.title}" excede limite de 4 substituições.`,
                    suggested_fix: "Remover substituições extras para garantir equivalência clínica.",
                    penalty: 25,
                });
            }
        }
    }

    score = Math.max(0, Math.min(100, score));
    const status = score >= 65 ? "approved" : "failed";
    return { score, status, issues, blocked_foods: uniqueBlocked };
}

function analyzePracticalAdherence(items: any[], simplicityScore: number, blockedCount: number): { score: number; status: string; factors: Array<{ factor: string; impact: number; detail: string }> } {
    let score = 100;
    const factors: Array<{ factor: string; impact: number; detail: string }> = [];
    if (simplicityScore >= 90) score += 10;
    else if (simplicityScore < 60) score -= 20;
    
    score = Math.max(0, Math.min(100, score));
    const status = score >= 65 ? "approved" : "failed";
    return { score, status, factors };
}

export async function handler(req: Request, maybeSupabaseClient?: any) {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { data: body, response: errorResponse } = await validateBody(req, ValidateMealPlanSchema);
        if (errorResponse) return errorResponse;
        if (!body) return new Response(JSON.stringify({ error: "No body" }), { status: 400 });

        const { meal_plan_id } = body as any;

        const supabase = (maybeSupabaseClient && typeof maybeSupabaseClient.from === "function")
            ? maybeSupabaseClient
            : createClient(
                Deno.env.get("SUPABASE_URL") ?? "",
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
            );

        const { data: mealPlan, error: planErr } = await supabase
            .from("meal_plans")
            .select("patient_id, title")
            .eq("id", meal_plan_id)
            .single();
        if (planErr || !mealPlan) throw new Error("Meal plan not found");

        const patientId = mealPlan.patient_id;

        const { data: items, error: itemsErr } = await supabase
            .from("meal_plan_items")
            .select("*")
            .eq("meal_plan_id", meal_plan_id);
        if (itemsErr) throw itemsErr;
        
        if (!items || items.length === 0) {
            return new Response(JSON.stringify({ success: false, score: 0, errors: [{ rule: "plano_vazio", message: "O plano não tem refeições.", weight: 100 }] }), { headers: corsHeaders });
        }

        const numDays = 1;
        let totalCals = 0, totalP = 0, totalC = 0, totalF = 0;
        let allDescriptions = "";

        for (const item of items) {
            totalCals += item.meta_calorias || 0;
            totalP += Number(item.meta_proteinas) || 0;
            totalC += Number(item.meta_carboidratos) || 0;
            totalF += Number(item.meta_gorduras) || 0;
            allDescriptions += " " + normalize(item.description || "");
        }

        const dailyCals = totalCals;
        const dailyP = totalP;
        const dailyC = totalC;
        const dailyF = totalF;

        const { data: assessment } = await supabase.from("physical_assessments").select("*").eq("patient_id", patientId).order("assessment_date", { ascending: false }).limit(1).single();
        const { data: anamnesis } = await supabase.from("patient_anamnesis").select("*").eq("user_id", patientId).eq("status", "completed").order("created_at", { ascending: false }).limit(1).single();

        let targetCals = assessment?.meta_calorias ?? anamnesis?.computed_kcal_target;
        let targetP = assessment?.meta_proteinas ?? anamnesis?.computed_protein;
        let targetC = assessment?.meta_carboidratos ?? anamnesis?.computed_carbs;
        let targetF = assessment?.meta_gorduras ?? anamnesis?.computed_fat;

        const clinicalErrors: any[] = [];
        const macroResults: any[] = [];

        if (targetCals) {
            const checks = [
                checkMacro("Calorias", "kcal", targetCals, dailyCals, "calories"),
                checkMacro("Proteína", "g", targetP, dailyP, "protein"),
                checkMacro("Carboidrato", "g", targetC, dailyC, "carbs"),
                checkMacro("Gordura", "g", targetF, dailyF, "fat"),
            ];
            for (const c of checks) {
                macroResults.push(c);
                if (!c.passed && c.rule !== "sem_meta") {
                    clinicalErrors.push({ 
                        rule: `div_${c.label.toLowerCase()}`, 
                        message: `${c.label} fora da meta: ${c.actual}${c.unit} (alvo ${c.target}${c.unit} ±${c.tolerance}%)`, 
                        weight: 30 
                    });
                }
            }
        }

        const simplicityResult = analyzePlanSimplicity(items, "emagrecimento");
        const adherenceResult = analyzePracticalAdherence(items, simplicityResult.score, simplicityResult.blocked_foods.length);

        const clinicalScore = Math.max(0, 100 - clinicalErrors.reduce((s, e) => s + e.weight, 0));
        const overallScore = Math.round((clinicalScore * 0.4) + (simplicityResult.score * 0.35) + (adherenceResult.score * 0.25));

        const prioritizedIssues = prioritizeIssuesInternal(simplicityResult.issues, clinicalErrors);
        const buckets = groupByBucketInternal(prioritizedIssues);
        const executiveSummary = `Plano validado com score ${overallScore}/100.`;

        const audit = { run_at: new Date().toISOString(), overall_score: overallScore };

        await supabase.from("meal_plans").update({
            clinical_score: clinicalScore,
            simplicity_score: simplicityResult.score,
            adherence_score: adherenceResult.score,
            overall_score: overallScore,
            last_validated_at: new Date().toISOString(),
        }).eq("id", meal_plan_id);

        return new Response(JSON.stringify({
            success: overallScore >= 65,
            score: overallScore,
            clinical_score: clinicalScore,
            simplicity_score: simplicityResult.score,
            executive_summary: executiveSummary,
            prioritized_issues: prioritizedIssues,
            buckets,
            macros: macroResults,
            errors: clinicalErrors,
            audit,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (e: any) {
        return new Response(JSON.stringify({ success: false, errors: [{ message: e.message }] }), { status: 500, headers: corsHeaders });
    }
}

function prioritizeIssuesInternal(simplicityIssues: any[], clinicalErrors: any[]): any[] {
    const issues: any[] = [];
    clinicalErrors.forEach(e => issues.push({ severity: "high", message: e.message, correction_bucket: "corrigir_agora", category: "clinical", tipo_refeicao: "", day: 0, penalty: e.weight }));
    simplicityIssues.forEach(i => issues.push({ severity: i.severity, message: i.message, correction_bucket: i.category === "critical" ? "bloquear_publicacao" : "corrigir_agora", category: i.category, tipo_refeicao: i.tipo_refeicao, day: i.day, penalty: i.penalty }));
    return issues;
}

function groupByBucketInternal(issues: any[]) {
    return {
        bloquear_publicacao: issues.filter(i => i.correction_bucket === "bloquear_publicacao"),
        corrigir_agora: issues.filter(i => i.correction_bucket === "corrigir_agora"),
        corrigir_depois: issues.filter(i => i.correction_bucket === "corrigir_depois" || i.correction_bucket === "opcional"),
    };
}

Deno.serve(handler);
