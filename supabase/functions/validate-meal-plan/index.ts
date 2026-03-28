import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// ── Blocked Foods (must mirror mealPlanFoodRules.ts) ──────────────────────────
const BLOCKED_FOODS = [
    "salmão", "salmon", "atum fresco",
    "kefir", "cottage", "ricota importada",
    "quinoa", "quinua", "amaranto",
    "castanha-do-pará", "castanha do pará", "macadâmia", "pistache",
    "framboesa", "mirtilo", "blueberry", "cranberry", "açaí premium",
    "tofu", "tempeh", "edamame",
    "granola premium", "mix de nuts", "trail mix",
    "azeite trufado", "vinagre balsâmico",
    "pasta de amendoim importada", "manteiga de amêndoa",
    "whey protein", "whey", "caseína", "creatina",
    "wrap integral", "pão artesanal",
    "leite de amêndoa", "leite de coco", "leite de aveia",
    "abacate toast", "overnight oats",
    "cream cheese", "philadelphia",
    "iogurte grego importado", "iogurte grego",
    "coalhada", "kombucha",
    "semente de chia importada", "hemp seed",
    "tahini", "tahine", "hummus",
    "burrata", "brie", "camembert", "gorgonzola",
];

function normalize(text: string): string {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function findBlockedFoods(text: string): string[] {
    const n = normalize(text);
    return BLOCKED_FOODS.filter(blocked => n.includes(normalize(blocked)));
}

type MacroKey = keyof typeof TOLERANCE;

interface MacroResult {
    label: string;
    unit: string;
    target: number;
    actual: number;
    diff_pct: number;
    tolerance: number;
    passed: boolean;
    rule: string;
}

function checkMacro(label: string, unit: string, target: number, actual: number, key: MacroKey): MacroResult {
    if (!target || target === 0) {
        return { label, unit, target: 0, actual, diff_pct: 0, tolerance: TOLERANCE[key], passed: true, rule: "sem_meta" };
    }
    const diff_pct = ((actual - target) / target);
    const passed = Math.abs(diff_pct) <= TOLERANCE[key];
    return {
        label, unit,
        target: Math.round(target),
        actual: Math.round(actual),
        diff_pct: Math.round(diff_pct * 1000) / 10,
        tolerance: TOLERANCE[key] * 100,
        passed,
        rule: `tolerância clínica ±${TOLERANCE[key] * 100}%`,
    };
}

// ── Server ────────────────────────────────────────────────────────────────────
serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { meal_plan_id } = await req.json();
        if (!meal_plan_id) throw new Error("Missing meal_plan_id");

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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
            return new Response(JSON.stringify({
                success: false, status: "reprovado", score: 0,
                errors: [{ rule: "plano_vazio", message: "O plano não tem refeições cadastradas.", weight: 100 }],
                macros: null, restrictions_violated: [], blocked_foods_found: [], audit: null,
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const days = new Set(items.map((i: any) => i.day_of_week));
        const numDays = days.size || 1;

        let totalCals = 0, totalP = 0, totalC = 0, totalF = 0;
        let allDescriptions = "";

        for (const item of items) {
            totalCals += item.calories_target || 0;
            totalP += Number(item.protein_target) || 0;
            totalC += Number(item.carbs_target) || 0;
            totalF += Number(item.fat_target) || 0;
            allDescriptions += " " + (item.description || "").toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        const dailyCals = totalCals / numDays;
        const dailyP = totalP / numDays;
        const dailyC = totalC / numDays;
        const dailyF = totalF / numDays;

        // ── Blocked Foods Audit ──────────────────────────────────────────────
        const blockedFoodsFound: Array<{ food: string; found_in: string; day: number; meal_type: string }> = [];
        
        for (const item of items) {
            const desc = item.description || "";
            const found = findBlockedFoods(desc);
            for (const food of found) {
                blockedFoodsFound.push({
                    food,
                    found_in: item.title || item.meal_type,
                    day: item.day_of_week,
                    meal_type: item.meal_type,
                });
            }
        }

        // Deduplicate by food+day+meal_type
        const uniqueBlocked = blockedFoodsFound.filter((item, idx, arr) =>
            arr.findIndex(x => x.food === item.food && x.day === item.day && x.meal_type === item.meal_type) === idx
        );

        // ── Fetch targets ────────────────────────────────────────────────────
        const { data: assessment } = await supabase
            .from("physical_assessments")
            .select("calories_target, protein_target, carbs_target, fat_target")
            .eq("patient_id", patientId)
            .order("assessment_date", { ascending: false })
            .limit(1).single();

        const { data: anamnesis } = await supabase
            .from("patient_anamnesis")
            .select("computed_kcal_target, computed_protein, computed_carbs, computed_fat, answers, audit_metadata")
            .eq("user_id", patientId)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(1).single();

        const targetCals = assessment?.calories_target ?? anamnesis?.computed_kcal_target;
        const targetP = assessment?.protein_target ?? anamnesis?.computed_protein;
        const targetC = assessment?.carbs_target ?? anamnesis?.computed_carbs;
        const targetF = assessment?.fat_target ?? anamnesis?.computed_fat;

        const errors: Array<{ rule: string; message: string; weight: number }> = [];
        const macroResults: MacroResult[] = [];

        if (!targetCals) {
            errors.push({
                rule: "sem_meta_calorica",
                message: "Paciente não tem meta calórica definida. Complete a Anamnese ou a Avaliação Física primeiro.",
                weight: 100,
            });
        } else {
            const checks = [
                checkMacro("Calorias", "kcal", targetCals, dailyCals, "calories"),
                checkMacro("Proteína", "g", targetP, dailyP, "protein"),
                checkMacro("Carboidrato", "g", targetC, dailyC, "carbs"),
                checkMacro("Gordura", "g", targetF, dailyF, "fat"),
            ];
            for (const c of checks) {
                macroResults.push(c);
                if (c.rule !== "sem_meta" && !c.passed) {
                    errors.push({
                        rule: `divergencia_${c.label.toLowerCase()}`,
                        message: `${c.label}: plano tem ${c.actual}${c.unit} vs meta de ${c.target}${c.unit} (${c.diff_pct > 0 ? "+" : ""}${c.diff_pct}%) — tolerância: ±${c.tolerance}%.`,
                        weight: c.label === "Calorias" || c.label === "Proteína" ? 30 : 20,
                    });
                }
            }
        }

        // ── Blocked food errors ──────────────────────────────────────────────
        if (uniqueBlocked.length > 0) {
            const uniqueFoods = [...new Set(uniqueBlocked.map(b => b.food))];
            errors.push({
                rule: "alimentos_bloqueados",
                message: `${uniqueBlocked.length} ocorrência(s) de alimentos inadequados: ${uniqueFoods.join(", ")}. Estes alimentos são caros, importados ou de baixa acessibilidade.`,
                weight: Math.min(40, uniqueBlocked.length * 3),
            });
        }

        // ── Restriction violations ───────────────────────────────────────────
        const restrictionsViolated: Array<{ restriction: string; keyword_found: string }> = [];
        const answers = (anamnesis?.answers as any) ?? {};
        const intoleranceMap: Record<string, string[]> = {
            "Intolerância à Lactose": ["leite", "queijo", "iogurte", "manteiga", "creme de leite", "whey"],
            "Intolerância ao Glúten": ["trigo", "pao", "gluten", "macarrao", "farinha", "bolo", "biscoito", "aveia"],
        };
        if (answers.lactose_intolerance === true || answers.lactose_intolerance === "yes") {
            for (const kw of intoleranceMap["Intolerância à Lactose"]) {
                if (allDescriptions.includes(kw)) { restrictionsViolated.push({ restriction: "Intolerância à Lactose", keyword_found: kw }); break; }
            }
        }
        if (answers.gluten_intolerance === true || answers.gluten_intolerance === "yes") {
            for (const kw of intoleranceMap["Intolerância ao Glúten"]) {
                if (allDescriptions.includes(kw)) { restrictionsViolated.push({ restriction: "Intolerância ao Glúten", keyword_found: kw }); break; }
            }
        }
        const customList = typeof answers.food_restrictions === "string"
            ? answers.food_restrictions.toLowerCase().split(",").map((s: string) => s.trim()).filter((s: string) => s.length >= 3)
            : [];
        for (const restriction of customList) {
            if (allDescriptions.includes(restriction)) restrictionsViolated.push({ restriction, keyword_found: restriction });
        }
        for (const rv of restrictionsViolated) {
            errors.push({ rule: "restricao_alimentar", message: `Restrição violada: "${rv.restriction}" — ingrediente "${rv.keyword_found}" encontrado no plano.`, weight: 50 });
        }

        // ── Score & result ───────────────────────────────────────────────────
        const scoreDeduction = errors.reduce((s, e) => s + e.weight, 0);
        const score = Math.max(0, 100 - scoreDeduction);
        const passed = errors.length === 0;
        const status = passed ? "aprovado" : "reprovado";

        const audit = {
            engine: "validate-meal-plan@deterministic_v3",
            run_at: new Date().toISOString(),
            inputs: { meal_plan_id, patient_id: patientId, num_days: numDays, num_items: items.length, source: assessment ? "physical_assessment" : "anamnesis" },
            targets: { kcal: targetCals, protein: targetP, carbs: targetC, fat: targetF },
            actuals: { kcal: Math.round(dailyCals), protein: Math.round(dailyP), carbs: Math.round(dailyC), fat: Math.round(dailyF) },
            tolerance_matrix: TOLERANCE,
            blocked_foods_audit: {
                total_occurrences: uniqueBlocked.length,
                unique_foods: [...new Set(uniqueBlocked.map(b => b.food))],
                details: uniqueBlocked,
            },
            score,
            rules_fired: errors.map((e) => e.rule),
        };

        if (passed) {
            await supabase.from("patient_timeline").insert({
                patient_id: patientId, event_type: "meal_plan",
                title: "Plano Aprovado pelo Motor Clínico ✅",
                description: `Score: ${score}/100 | Kcal: ${Math.round(dailyCals)} (meta ${Math.round(targetCals ?? 0)}) | P: ${Math.round(dailyP)}g | C: ${Math.round(dailyC)}g | G: ${Math.round(dailyF)}g`,
                metadata: { type: "ai_plan_validated", meal_plan_id, score, ...audit },
            });
        } else {
            await supabase.from("patient_timeline").insert({
                patient_id: patientId, event_type: "meal_plan",
                title: "Plano Reprovado pelo Motor Clínico ❌",
                description: `Score: ${score}/100 — ${errors.length} divergência(s) encontrada(s). ${uniqueBlocked.length > 0 ? `Alimentos bloqueados: ${[...new Set(uniqueBlocked.map(b => b.food))].join(", ")}.` : ""}`,
                metadata: { type: "plan_validation_failed", meal_plan_id, score, errors, ...audit },
            });
        }

        return new Response(JSON.stringify({
            success: passed, status, score,
            macros: macroResults,
            restrictions_violated: restrictionsViolated,
            blocked_foods_found: uniqueBlocked,
            errors,
            audit,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (e: any) {
        console.error("validate-meal-plan error:", e);
        return new Response(JSON.stringify({ success: false, errors: [{ rule: "system_error", message: e.message, weight: 0 }] }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
