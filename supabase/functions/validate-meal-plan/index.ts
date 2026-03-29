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

// ── Blocked Foods ─────────────────────────────────────────────────────────────
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

// ── Brazilian Replacements ────────────────────────────────────────────────────
const REPLACEMENTS: Record<string, string> = {
    "kefir": "iogurte natural",
    "cottage": "queijo minas",
    "salmão": "tilápia grelhada",
    "salmon": "tilápia grelhada",
    "blueberry": "morango",
    "mirtilo": "morango",
    "framboesa": "morango",
    "cranberry": "acerola",
    "quinoa": "arroz integral",
    "quinua": "arroz integral",
    "tahine": "pasta de amendoim",
    "tahini": "pasta de amendoim",
    "cream cheese": "requeijão",
    "philadelphia": "requeijão",
    "iogurte grego": "iogurte natural",
    "wrap integral": "tapioca",
    "overnight oats": "aveia com banana",
    "hummus": "feijão",
    "tofu": "ovo cozido",
    "tempeh": "ovo cozido",
    "whey protein": "ovo cozido",
    "whey": "ovo cozido",
    "burrata": "muçarela",
    "brie": "queijo minas",
    "camembert": "queijo minas",
    "gorgonzola": "muçarela",
    "kombucha": "chá natural",
    "abacate toast": "pão com ovo",
    "pão artesanal": "pão integral",
    "leite de amêndoa": "leite desnatado",
    "leite de aveia": "leite integral",
    "granola premium": "granola simples",
    "mix de nuts": "amendoim torrado",
    "pistache": "amendoim",
    "macadâmia": "amendoim",
};

// ── Premium / Complex keywords ────────────────────────────────────────────────
const PREMIUM_KEYWORDS = [
    "premium", "importado", "importada", "gourmet", "artesanal",
    "overnight", "brunch", "toast", "wrap", "smoothie bowl",
    "açaí bowl", "poke", "buddha bowl",
];

const COMPLEX_PREP_KEYWORDS = [
    "overnight oats", "smoothie", "bowl de", "wrap de",
    "panqueca de", "crepe de", "risoto",
];

// ── Brazilian base foods for main meals ───────────────────────────────────────
const BRAZILIAN_PROTEINS = ["frango", "carne", "peixe", "tilápia", "sardinha", "ovo", "porco", "bife", "filé"];
const BRAZILIAN_CARBS = ["arroz", "macarrão", "batata", "batata doce", "macaxeira", "purê", "cuscuz", "feijão"];
const ALLOWED_FRUITS = ["banana", "maçã", "mamão", "melão", "manga", "abacaxi", "laranja", "morango", "uva", "melancia", "goiaba", "acerola", "pera"];

function normalize(text: string): string {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
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

// ── Simplicity Analysis ───────────────────────────────────────────────────────

interface SimplicityIssue {
    category: "critical" | "adherence" | "suggestion";
    severity: "critical" | "high" | "medium" | "low";
    meal_type: string;
    day: number;
    message: string;
    suggested_fix: string;
    penalty: number;
}

function analyzePlanSimplicity(items: any[]): { score: number; status: string; issues: SimplicityIssue[]; blocked_foods: Array<{ food: string; found_in: string; day: number; meal_type: string; replacement: string | null }> } {
    let score = 100;
    const issues: SimplicityIssue[] = [];
    const blockedFoods: Array<{ food: string; found_in: string; day: number; meal_type: string; replacement: string | null }> = [];

    // Group by day+meal_type
    const groups = new Map<string, any[]>();
    for (const item of items) {
        const k = `${item.day_of_week ?? 0}_${item.meal_type}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(item);
    }

    // 1. Blocked foods scan (hard fail -20 each)
    for (const item of items) {
        const desc = normalize(`${item.title || ""} ${item.description || ""}`);
        const found = findBlockedFoods(desc);
        for (const food of found) {
            const nf = normalize(food);
            const replacement = REPLACEMENTS[nf] || REPLACEMENTS[food] || null;
            blockedFoods.push({
                food,
                found_in: item.title || item.meal_type,
                day: item.day_of_week ?? 0,
                meal_type: item.meal_type,
                replacement,
            });
            score -= 20;
            issues.push({
                category: "critical",
                severity: "critical",
                meal_type: item.meal_type,
                day: item.day_of_week ?? 0,
                message: `Alimento bloqueado: "${food}"`,
                suggested_fix: replacement ? `Trocar por: ${replacement}` : `Remover "${food}"`,
                penalty: 20,
            });
        }
        // Premium keywords
        for (const kw of PREMIUM_KEYWORDS) {
            if (desc.includes(normalize(kw))) {
                score -= 10;
                issues.push({
                    category: "adherence",
                    severity: "high",
                    meal_type: item.meal_type,
                    day: item.day_of_week ?? 0,
                    message: `Ingrediente premium/gourmet: "${kw}"`,
                    suggested_fix: "Substituir por versão popular brasileira",
                    penalty: 10,
                });
            }
        }
        // Complex prep
        for (const prep of COMPLEX_PREP_KEYWORDS) {
            if (desc.includes(normalize(prep))) {
                score -= 6;
                issues.push({
                    category: "suggestion",
                    severity: "medium",
                    meal_type: item.meal_type,
                    day: item.day_of_week ?? 0,
                    message: `Preparo complexo: "${prep}"`,
                    suggested_fix: "Simplificar para versão prática",
                    penalty: 6,
                });
            }
        }
    }

    // Deduplicate blocked foods
    const uniqueBlocked = blockedFoods.filter((item, idx, arr) =>
        arr.findIndex(x => x.food === item.food && x.day === item.day && x.meal_type === item.meal_type) === idx
    );

    // 2. Per-meal checks
    for (const [key, mealItems] of groups.entries()) {
        const [dayStr, ...mealParts] = key.split("_");
        const mealType = mealParts.join("_");
        const day = parseInt(dayStr);

        // Excess items (>5)
        if (mealItems.length > 5) {
            score -= 10;
            issues.push({
                category: "adherence",
                severity: "high",
                meal_type: mealType, day,
                message: `Refeição com ${mealItems.length} itens (máx 5)`,
                suggested_fix: "Reduzir para no máximo 5 itens",
                penalty: 10,
            });
        }

        // Excess fruits (>2)
        const fruitCount = mealItems.filter((item: any) => {
            const text = normalize(`${item.title || ""} ${item.description || ""}`);
            return ALLOWED_FRUITS.some(f => text.includes(normalize(f)));
        }).length;
        if (fruitCount > 2) {
            score -= 10;
            issues.push({
                category: "adherence",
                severity: "high",
                meal_type: mealType, day,
                message: `${fruitCount} frutas na mesma refeição (máx 2)`,
                suggested_fix: "Reduzir para 1-2 frutas",
                penalty: 10,
            });
        }

        // Breakfast checks
        if (mealType === "breakfast" || mealType === "cafe_da_manha") {
            if (mealItems.length > 3) {
                score -= 10;
                issues.push({
                    category: "adherence",
                    severity: "high",
                    meal_type: mealType, day,
                    message: `Café da manhã com ${mealItems.length} itens (recomendado: até 3)`,
                    suggested_fix: "Simplificar: pão+ovo, tapioca+queijo, cuscuz+ovo",
                    penalty: 10,
                });
            }
            const totalProtein = mealItems.reduce((s: number, i: any) => s + (Number(i.protein_target) || 0), 0);
            if (totalProtein > 30) {
                score -= 10;
                issues.push({
                    category: "adherence",
                    severity: "high",
                    meal_type: mealType, day,
                    message: `Proteína excessiva no café (${Math.round(totalProtein)}g > 30g)`,
                    suggested_fix: "Reduzir para máx 2 ovos ou 1 porção de queijo",
                    penalty: 10,
                });
            }
        }

        // Snack checks
        if (mealType.includes("snack") || mealType.includes("lanche")) {
            if (mealItems.length > 2) {
                score -= 10;
                issues.push({
                    category: "adherence",
                    severity: "medium",
                    meal_type: mealType, day,
                    message: `Lanche com ${mealItems.length} itens (recomendado: 1-2)`,
                    suggested_fix: "Simplificar: 1 fruta ou fruta + iogurte",
                    penalty: 10,
                });
            }
        }

        // Main meals (lunch/dinner) - must have Brazilian base
        if (["lunch", "almoco", "dinner", "jantar"].includes(mealType)) {
            const allText = mealItems.map((i: any) => normalize(`${i.title || ""} ${i.description || ""}`)).join(" ");
            const hasProtein = BRAZILIAN_PROTEINS.some(p => allText.includes(normalize(p)));
            const hasCarb = BRAZILIAN_CARBS.some(c => allText.includes(normalize(c)));
            if (!hasProtein || !hasCarb) {
                score -= 10;
                issues.push({
                    category: "adherence",
                    severity: "high",
                    meal_type: mealType, day,
                    message: `Refeição principal sem base brasileira (${!hasProtein ? "falta proteína" : ""}${!hasProtein && !hasCarb ? " e " : ""}${!hasCarb ? "falta carboidrato" : ""})`,
                    suggested_fix: "Usar: arroz + feijão + frango, macarrão + carne, batata + frango",
                    penalty: 10,
                });
            }
        }
    }

    score = Math.max(0, Math.min(100, score));
    const status = score >= 75 ? "approved" : "failed";
    return { score, status, issues, blocked_foods: uniqueBlocked };
}

// ── Practical Adherence Prediction ────────────────────────────────────────────

function analyzePracticalAdherence(items: any[], simplicityScore: number, blockedCount: number): { score: number; status: string; factors: Array<{ factor: string; impact: number; detail: string }> } {
    let score = 100;
    const factors: Array<{ factor: string; impact: number; detail: string }> = [];

    // Factor 1: Simplicity bonus/penalty
    if (simplicityScore >= 90) {
        score += 10;
        factors.push({ factor: "Plano simples", impact: 10, detail: "Plano com alta simplicidade aumenta adesão" });
    } else if (simplicityScore < 60) {
        score -= 20;
        factors.push({ factor: "Plano complexo", impact: -20, detail: "Complexidade alta reduz adesão drasticamente" });
    } else if (simplicityScore < 75) {
        score -= 10;
        factors.push({ factor: "Complexidade moderada", impact: -10, detail: "Plano com complexidade acima do ideal" });
    }

    // Factor 2: Blocked foods penalty
    if (blockedCount > 0) {
        const penalty = Math.min(30, blockedCount * 15);
        score -= penalty;
        factors.push({ factor: "Alimentos difíceis", impact: -penalty, detail: `${blockedCount} alimento(s) de difícil acesso encontrado(s)` });
    }

    // Factor 3: Repetibility (meals with too many unique items = low repetibility)
    const groups = new Map<string, any[]>();
    for (const item of items) {
        const k = item.meal_type;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(item);
    }

    const days = new Set(items.map((i: any) => i.day_of_week)).size || 1;
    const avgItemsPerMeal = items.length / Math.max(1, groups.size * days);
    if (avgItemsPerMeal > 4) {
        score -= 10;
        factors.push({ factor: "Repetibilidade baixa", impact: -10, detail: `Média de ${avgItemsPerMeal.toFixed(1)} itens por refeição dificulta repetição` });
    }

    // Factor 4: Meal count per day
    const mealsPerDay = groups.size;
    if (mealsPerDay > 6) {
        score -= 10;
        factors.push({ factor: "Muitas refeições", impact: -10, detail: `${mealsPerDay} tipos de refeição por dia é difícil de manter` });
    }

    score = Math.max(0, Math.min(100, score));
    const status = score >= 65 ? "approved" : "failed";
    return { score, status, factors };
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
                success: false,
                overall_status: "reprovado",
                clinical_status: "reprovado", simplicity_status: "failed", practical_status: "failed",
                clinical_score: 0, simplicity_score: 0, adherence_score_prediction: 0,
                score: 0,
                errors: [{ rule: "plano_vazio", message: "O plano não tem refeições cadastradas.", weight: 100 }],
                macros: null, restrictions_violated: [], blocked_foods_found: [],
                simplicity_issues: [], adherence_factors: [],
                suggestions: [], audit: null,
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
            allDescriptions += " " + normalize(item.description || "");
        }

        const dailyCals = totalCals / numDays;
        const dailyP = totalP / numDays;
        const dailyC = totalC / numDays;
        const dailyF = totalF / numDays;

        // ── 1. Clinical Validation (existing) ────────────────────────────────
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

        const clinicalErrors: Array<{ rule: string; message: string; weight: number }> = [];
        const macroResults: MacroResult[] = [];

        if (!targetCals) {
            clinicalErrors.push({
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
                    clinicalErrors.push({
                        rule: `divergencia_${c.label.toLowerCase()}`,
                        message: `${c.label}: plano tem ${c.actual}${c.unit} vs meta de ${c.target}${c.unit} (${c.diff_pct > 0 ? "+" : ""}${c.diff_pct}%) — tolerância: ±${c.tolerance}%.`,
                        weight: c.label === "Calorias" || c.label === "Proteína" ? 30 : 20,
                    });
                }
            }
        }

        // Restriction violations
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
            clinicalErrors.push({ rule: "restricao_alimentar", message: `Restrição violada: "${rv.restriction}" — ingrediente "${rv.keyword_found}" encontrado no plano.`, weight: 50 });
        }

        const clinicalDeduction = clinicalErrors.reduce((s, e) => s + e.weight, 0);
        const clinicalScore = Math.max(0, 100 - clinicalDeduction);
        const clinicalPassed = clinicalErrors.length === 0;
        const clinicalStatus = clinicalPassed ? "approved" : "reprovado";

        // ── 2. Simplicity Validation (NEW) ───────────────────────────────────
        const simplicityResult = analyzePlanSimplicity(items);

        // ── 3. Practical Adherence Prediction (NEW) ──────────────────────────
        const adherenceResult = analyzePracticalAdherence(items, simplicityResult.score, simplicityResult.blocked_foods.length);

        // ── Overall Status ───────────────────────────────────────────────────
        const overallPassed = clinicalPassed && simplicityResult.status !== "failed" && adherenceResult.status !== "failed";
        const overallStatus = overallPassed ? "aprovado" : "reprovado";
        const overallScore = Math.round((clinicalScore * 0.4) + (simplicityResult.score * 0.35) + (adherenceResult.score * 0.25));

        // Merge all errors
        const allErrors = [
            ...clinicalErrors,
            ...(simplicityResult.blocked_foods.length > 0 ? [{
                rule: "alimentos_bloqueados",
                message: `${simplicityResult.blocked_foods.length} alimento(s) bloqueado(s): ${[...new Set(simplicityResult.blocked_foods.map(b => b.food))].join(", ")}`,
                weight: Math.min(40, simplicityResult.blocked_foods.length * 3),
            }] : []),
        ];

        // Generate suggestion list
        const suggestions = simplicityResult.blocked_foods
            .filter(bf => bf.replacement)
            .map(bf => ({
                before: bf.food,
                after: bf.replacement,
                meal_type: bf.meal_type,
                day: bf.day,
            }));

        // Deduplicate suggestions
        const uniqueSuggestions = suggestions.filter((s, idx, arr) =>
            arr.findIndex(x => x.before === s.before && x.day === s.day && x.meal_type === s.meal_type) === idx
        );

        const audit = {
            engine: "validate-meal-plan@unified_v4",
            run_at: new Date().toISOString(),
            inputs: { meal_plan_id, patient_id: patientId, num_days: numDays, num_items: items.length, source: assessment ? "physical_assessment" : "anamnesis" },
            targets: { kcal: targetCals, protein: targetP, carbs: targetC, fat: targetF },
            actuals: { kcal: Math.round(dailyCals), protein: Math.round(dailyP), carbs: Math.round(dailyC), fat: Math.round(dailyF) },
            tolerance_matrix: TOLERANCE,
            clinical: { score: clinicalScore, status: clinicalStatus, errors_count: clinicalErrors.length },
            simplicity: { score: simplicityResult.score, status: simplicityResult.status, issues_count: simplicityResult.issues.length, blocked_count: simplicityResult.blocked_foods.length },
            adherence: { score: adherenceResult.score, status: adherenceResult.status, factors_count: adherenceResult.factors.length },
            overall: { score: overallScore, status: overallStatus },
        };

        // ── Persist validation scores to meal_plans ─────────────────────────
        await supabase.from("meal_plans").update({
            clinical_score: clinicalScore,
            simplicity_score: simplicityResult.score,
            adherence_score: adherenceResult.score,
            overall_score: overallScore,
            overall_validation_status: overallStatus,
            last_validated_at: new Date().toISOString(),
            validation_engine_version: "unified_v4",
        }).eq("id", meal_plan_id);

        // Timeline
        const timelineTitle = overallPassed
            ? "Plano Aprovado pelo Motor Clínico Unificado ✅"
            : "Plano Reprovado pelo Motor Clínico Unificado ❌";
        const timelineDesc = `Score: ${overallScore}/100 (Clínico: ${clinicalScore} | Simplicidade: ${simplicityResult.score} | Adesão: ${adherenceResult.score})${simplicityResult.blocked_foods.length > 0 ? ` | Bloqueados: ${[...new Set(simplicityResult.blocked_foods.map(b => b.food))].join(", ")}` : ""}`;

        await supabase.from("patient_timeline").insert({
            patient_id: patientId, event_type: "meal_plan",
            title: timelineTitle,
            description: timelineDesc,
            metadata: { type: overallPassed ? "ai_plan_validated" : "plan_validation_failed", meal_plan_id, ...audit },
        });

        return new Response(JSON.stringify({
            success: overallPassed,
            status: overallStatus,
            overall_status: overallStatus,
            score: overallScore,

            clinical_status: clinicalStatus,
            simplicity_status: simplicityResult.status,
            practical_status: adherenceResult.status,

            clinical_score: clinicalScore,
            simplicity_score: simplicityResult.score,
            adherence_score_prediction: adherenceResult.score,

            macros: macroResults,
            restrictions_violated: restrictionsViolated,
            blocked_foods_found: simplicityResult.blocked_foods,
            errors: allErrors,

            simplicity_issues: simplicityResult.issues,
            adherence_factors: adherenceResult.factors,
            suggestions: uniqueSuggestions,
            audit,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (e: any) {
        console.error("validate-meal-plan error:", e);
        return new Response(JSON.stringify({ success: false, errors: [{ rule: "system_error", message: e.message, weight: 0 }] }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
