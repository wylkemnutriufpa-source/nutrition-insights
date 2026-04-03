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
    "whey protein", "caseína", "creatina",
    "wrap integral", "pão artesanal",
    "leite de amêndoa", "leite de coco", "leite de aveia",
    "abacate toast", "overnight oats",
    "cream cheese", "philadelphia",
    "iogurte grego importado",
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
const BRAZILIAN_PROTEINS = ["frango", "carne", "peixe", "tilápia", "sardinha", "ovo", "omelete", "porco", "bife", "filé", "linguiça", "charque", "jabá", "atum", "merluza", "sobrecoxa", "alcatra", "patinho", "acém", "carne moída", "carne moida"];
const BRAZILIAN_CARBS = ["arroz", "macarrão", "batata", "batata doce", "macaxeira", "purê", "cuscuz", "feijão", "tapioca", "inhame", "aipim", "mandioca", "farinha", "farofa", "milho", "açaí", "aveia", "pão", "pao", "torrada", "espaguete", "lentilha", "grão de bico", "grao de bico"];
const ALLOWED_FRUITS = ["banana", "maçã", "mamão", "melão", "manga", "abacaxi", "laranja", "morango", "uva", "melancia", "goiaba", "acerola", "pera", "tangerina"];

function normalize(text: string): string {
    // Strip AutoFix annotations like [Proteína: 38→33g, ×0.87] before normalizing
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

function analyzePlanSimplicity(items: any[], goal: string): { score: number; status: string; issues: SimplicityIssue[]; blocked_foods: Array<{ food: string; found_in: string; day: number; meal_type: string; replacement: string | null }> } {
    let score = 100;
    const issues: SimplicityIssue[] = [];
    const blockedFoods: Array<{ food: string; found_in: string; day: number; meal_type: string; replacement: string | null }> = [];
    const isMassGain = ["muscle_gain", "ganho_de_massa", "mass", "bulking", "performance"].includes(normalize(goal));

    // Group by day+meal_type
    const groups = new Map<string, any[]>();
    for (const item of items) {
        const k = `${item.day_of_week ?? 0}_${item.meal_type}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(item);
    }

    // Track already-penalized items to avoid duplicate penalties
    const penalizedKeys = new Set<string>();

    // 1. Blocked foods scan (hard fail -20 each, deduplicated per food+day+meal)
    for (const item of items) {
        const desc = getPrimaryMealText(item);
        const found = findBlockedFoods(desc);
        for (const food of found) {
            const dedupKey = `blocked_${normalize(food)}_${item.day_of_week ?? 0}_${item.meal_type}`;
            if (penalizedKeys.has(dedupKey)) continue;
            penalizedKeys.add(dedupKey);

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
        // Premium keywords (skip if already penalized as blocked food)
        for (const kw of PREMIUM_KEYWORDS) {
            const kwKey = `premium_${normalize(kw)}_${item.day_of_week ?? 0}_${item.meal_type}`;
            if (penalizedKeys.has(kwKey)) continue;
            if (desc.includes(normalize(kw))) {
                // Don't double-penalize if this keyword is part of a blocked food already caught
                const alreadyBlocked = found.some(f => normalize(kw).includes(normalize(f)) || normalize(f).includes(normalize(kw)));
                if (alreadyBlocked) continue;
                penalizedKeys.add(kwKey);
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
        // Complex prep (skip if already penalized as blocked)
        for (const prep of COMPLEX_PREP_KEYWORDS) {
            const prepKey = `prep_${normalize(prep)}_${item.day_of_week ?? 0}_${item.meal_type}`;
            if (penalizedKeys.has(prepKey)) continue;
            if (desc.includes(normalize(prep))) {
                const alreadyBlocked = found.some(f => normalize(prep).includes(normalize(f)) || normalize(f).includes(normalize(prep)));
                if (alreadyBlocked) continue;
                penalizedKeys.add(prepKey);
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
            const text = getPrimaryMealText(item);
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

        // Breakfast checks (relaxed for mass gain)
        if (mealType === "breakfast" || mealType === "cafe_da_manha") {
            const breakfastMaxItems = isMassGain ? 4 : 3;
            if (mealItems.length > breakfastMaxItems) {
                score -= 10;
                issues.push({
                    category: "adherence",
                    severity: "high",
                    meal_type: mealType, day,
                    message: `Café da manhã com ${mealItems.length} itens (recomendado: até ${breakfastMaxItems})`,
                    suggested_fix: isMassGain ? "Café reforçado: pão+2 ovos+queijo" : "Simplificar: pão+ovo, tapioca+queijo, cuscuz+ovo",
                    penalty: 10,
                });
            }
            const proteinLimit = isMassGain ? 45 : 35;
            const totalProtein = mealItems.reduce((s: number, i: any) => s + (Number(i.protein_target) || 0), 0);
            if (totalProtein > proteinLimit) {
                score -= 10;
                issues.push({
                    category: "adherence",
                    severity: "high",
                    meal_type: mealType, day,
                    message: `Proteína excessiva no café (${Math.round(totalProtein)}g > ${proteinLimit}g)`,
                    suggested_fix: isMassGain ? "Reduzir para máx 3 ovos + queijo" : "Reduzir para máx 2 ovos ou 1 porção de queijo",
                    penalty: 10,
                });
            }
        }

        // Snack checks (relaxed for mass gain)
        if (mealType.includes("snack") || mealType.includes("lanche")) {
            const snackMaxItems = isMassGain ? 3 : 2;
            if (mealItems.length > snackMaxItems) {
                score -= 10;
                issues.push({
                    category: "adherence",
                    severity: "medium",
                    meal_type: mealType, day,
                    message: `Lanche com ${mealItems.length} itens (recomendado: até ${snackMaxItems})`,
                    suggested_fix: isMassGain ? "Lanche proteico: pão+ovo ou tapioca+queijo" : "Simplificar: 1 fruta ou fruta + iogurte",
                    penalty: 10,
                });
            }
        }

        // Main meals (lunch/dinner) - must have Brazilian base
        if (["lunch", "almoco", "dinner", "jantar"].includes(mealType)) {
            const allText = mealItems.map((i: any) => getPrimaryMealText(i)).join(" ");
            const hasProtein = BRAZILIAN_PROTEINS.some(p => allText.includes(normalize(p)));
            const hasCarb = BRAZILIAN_CARBS.some(c => allText.includes(normalize(c)));
            if (!hasProtein || !hasCarb) {
                score -= 5;
                issues.push({
                    category: "adherence",
                    severity: "medium",
                    meal_type: mealType, day,
                    message: `Refeição principal sem base brasileira (${!hasProtein ? "falta proteína" : ""}${!hasProtein && !hasCarb ? " e " : ""}${!hasCarb ? "falta carboidrato" : ""})`,
                    suggested_fix: "Usar: arroz + feijão + frango, macarrão + carne, batata + frango",
                    penalty: 5,
                });
            }
        }
    }

    score = Math.max(0, Math.min(100, score));
    const status = score >= 65 ? "approved" : "failed";
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
                overall_status: "suggest_corrections",
                clinical_status: "suggest_corrections", simplicity_status: "failed", practical_status: "failed",
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
            const primaryDescription = splitPrimaryDescription(item.description || "").primary;
            allDescriptions += " " + normalize(primaryDescription || "");
        }

        const dailyCals = totalCals / numDays;
        const dailyP = totalP / numDays;
        const dailyC = totalC / numDays;
        const dailyF = totalF / numDays;

        // ── Cross-day consistency check ──────────────────────────────────────
        // Detect when individual days deviate >10% from the plan average
        const CROSS_DAY_TOLERANCE = 0.10; // 10% max variance between days
        const perDayMacros = new Map<number, { cals: number; prot: number; carbs: number; fat: number }>();
        for (const item of items) {
            const d = item.day_of_week ?? 0;
            if (!perDayMacros.has(d)) perDayMacros.set(d, { cals: 0, prot: 0, carbs: 0, fat: 0 });
            const m = perDayMacros.get(d)!;
            m.cals += item.calories_target || 0;
            m.prot += Number(item.protein_target) || 0;
            m.carbs += Number(item.carbs_target) || 0;
            m.fat += Number(item.fat_target) || 0;
        }

        interface CrossDayInconsistency {
            macro: string;
            unit: string;
            avg: number;
            min_day: number;
            min_val: number;
            max_day: number;
            max_val: number;
            variance_pct: number;
        }
        const crossDayInconsistencies: CrossDayInconsistency[] = [];
        const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

        function checkCrossDayConsistency(macroLabel: string, unit: string, key: "cals" | "prot" | "carbs" | "fat", avg: number) {
            if (avg <= 0 || numDays < 2) return;
            let minVal = Infinity, maxVal = -Infinity, minDay = 0, maxDay = 0;
            for (const [day, m] of perDayMacros.entries()) {
                const val = m[key];
                if (val < minVal) { minVal = val; minDay = day; }
                if (val > maxVal) { maxVal = val; maxDay = day; }
            }
            const variancePct = (maxVal - minVal) / avg;
            if (variancePct > CROSS_DAY_TOLERANCE) {
                crossDayInconsistencies.push({
                    macro: macroLabel, unit, avg: Math.round(avg),
                    min_day: minDay, min_val: Math.round(minVal),
                    max_day: maxDay, max_val: Math.round(maxVal),
                    variance_pct: Math.round(variancePct * 100),
                });
            }
        }
        checkCrossDayConsistency("Proteína", "g", "prot", dailyP);
        checkCrossDayConsistency("Calorias", "kcal", "cals", dailyCals);
        checkCrossDayConsistency("Carboidrato", "g", "carbs", dailyC);
        checkCrossDayConsistency("Gordura", "g", "fat", dailyF);

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
        const clinicalStatus = clinicalPassed ? "approved" : "suggest_corrections";

        // ── 2. Simplicity Validation ──────────────────────────────────────
        const patientGoal = (answers?.primary_goal || answers?.objective || answers?.goal || "emagrecimento") as string;
        const simplicityResult = analyzePlanSimplicity(items, patientGoal);

        // ── 3. Practical Adherence Prediction (NEW) ──────────────────────────
        const adherenceResult = analyzePracticalAdherence(items, simplicityResult.score, simplicityResult.blocked_foods.length);

        // ── Overall Status ───────────────────────────────────────────────────
        const overallPassed = clinicalPassed && simplicityResult.status !== "failed" && adherenceResult.status !== "failed";
        const overallStatus = overallPassed ? "aprovado" : "sugestoes_melhoria";
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

        // ── 4. Clinical Decision Layer (v5) ─────────────────────────────
        const prioritizedIssues = prioritizeIssuesInternal(
            simplicityResult.issues, clinicalErrors, restrictionsViolated
        );
        const buckets = groupByBucketInternal(prioritizedIssues);
        const { decision: finalDecision, reason: finalDecisionReason, confidence: confidenceLevel } =
            computeFinalDecisionInternal(overallScore, overallPassed, prioritizedIssues);
        const { summary: executiveSummary, recommendation: approvalRecommendation, strategy: correctionStrategy } =
            generateExecutiveSummaryInternal(
                overallPassed, overallScore, clinicalScore, simplicityResult.score, adherenceResult.score,
                simplicityResult.blocked_foods.length, restrictionsViolated.length, prioritizedIssues
            );

        const audit = {
            engine: "validate-meal-plan@unified_v5",
            run_at: new Date().toISOString(),
            inputs: { meal_plan_id, patient_id: patientId, num_days: numDays, num_items: items.length, source: assessment ? "physical_assessment" : "anamnesis" },
            targets: { kcal: targetCals, protein: targetP, carbs: targetC, fat: targetF },
            actuals: { kcal: Math.round(dailyCals), protein: Math.round(dailyP), carbs: Math.round(dailyC), fat: Math.round(dailyF) },
            tolerance_matrix: TOLERANCE,
            clinical: { score: clinicalScore, status: clinicalStatus, errors_count: clinicalErrors.length },
            simplicity: { score: simplicityResult.score, status: simplicityResult.status, issues_count: simplicityResult.issues.length, blocked_count: simplicityResult.blocked_foods.length },
            adherence: { score: adherenceResult.score, status: adherenceResult.status, factors_count: adherenceResult.factors.length },
            overall: { score: overallScore, status: overallStatus },
            decision: { final_decision: finalDecision, confidence_level: confidenceLevel, prioritized_issues_count: prioritizedIssues.length },
        };

        // ── Persist validation scores to meal_plans ─────────────────────────
        await supabase.from("meal_plans").update({
            clinical_score: clinicalScore,
            simplicity_score: simplicityResult.score,
            adherence_score: adherenceResult.score,
            overall_score: overallScore,
            overall_validation_status: overallStatus,
            last_validated_at: new Date().toISOString(),
            validation_engine_version: "unified_v5",
        }).eq("id", meal_plan_id);

        // Timeline
        const timelineTitle = overallPassed
            ? "Plano Aprovado pelo Motor Clínico Unificado ✅"
            : "Plano com Sugestões de Melhoria — Motor Clínico Unificado 📋";
        const timelineDesc = `Score: ${overallScore}/100 (Clínico: ${clinicalScore} | Simplicidade: ${simplicityResult.score} | Adesão: ${adherenceResult.score}) | Decisão: ${finalDecision}`;

        await supabase.from("patient_timeline").insert({
            patient_id: patientId, event_type: "meal_plan",
            title: timelineTitle,
            description: timelineDesc,
            metadata: {
                type: overallPassed ? "ai_plan_validated" : "plan_validation_failed",
                meal_plan_id,
                final_decision: finalDecision,
                final_decision_reason: finalDecisionReason,
                confidence_level: confidenceLevel,
                executive_summary: executiveSummary,
                prioritized_issues_count: prioritizedIssues.length,
                ...audit,
            },
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

            // Decision layer (v5)
            executive_summary: executiveSummary,
            approval_recommendation: approvalRecommendation,
            correction_strategy: correctionStrategy,
            final_decision: finalDecision,
            final_decision_reason: finalDecisionReason,
            confidence_level: confidenceLevel,
            prioritized_issues: prioritizedIssues,
            buckets,

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

// ── Decision Helper Functions (inline for edge function context) ──────────────

type IssueSeverity = "critical" | "high" | "medium" | "low";
type CorrectionBucket = "bloquear_publicacao" | "corrigir_agora" | "corrigir_depois" | "opcional";

interface PrioritizedIssue {
    severity: IssueSeverity;
    priority_order: number;
    correction_bucket: CorrectionBucket;
    category: string;
    meal_type: string;
    day: number;
    message: string;
    suggested_fix: string;
    penalty: number;
}

const SEV_PRIORITY: Record<IssueSeverity, number> = { critical: 1, high: 2, medium: 3, low: 4 };

function assignBucket(sev: IssueSeverity, cat: string): CorrectionBucket {
    if (sev === "critical") return "bloquear_publicacao";
    if (sev === "high" && cat === "critical") return "bloquear_publicacao";
    if (sev === "high") return "corrigir_agora";
    if (sev === "medium") return "corrigir_depois";
    return "opcional";
}

function prioritizeIssuesInternal(
    simplicityIssues: SimplicityIssue[],
    clinicalErrors: Array<{ rule: string; message: string; weight: number }>,
    restrictionsViolated: Array<{ restriction: string; keyword_found: string }>
): PrioritizedIssue[] {
    const issues: PrioritizedIssue[] = [];
    let order = 0;
    for (const rv of restrictionsViolated) {
        order++;
        issues.push({ severity: "critical", priority_order: order, correction_bucket: "bloquear_publicacao", category: "restriction", meal_type: "", day: 0, message: `Restrição violada: "${rv.restriction}" — "${rv.keyword_found}"`, suggested_fix: `Remover "${rv.keyword_found}"`, penalty: 50 });
    }
    for (const err of clinicalErrors) {
        if (err.rule === "restricao_alimentar") continue;
        order++;
        const sev: IssueSeverity = err.weight >= 50 ? "critical" : err.weight >= 30 ? "high" : "medium";
        issues.push({ severity: sev, priority_order: order, correction_bucket: assignBucket(sev, "clinical"), category: "clinical", meal_type: "", day: 0, message: err.message, suggested_fix: err.rule === "sem_meta_calorica" ? "Completar Anamnese ou Avaliação Física" : "Ajustar quantidades de macros", penalty: err.weight });
    }
    for (const issue of simplicityIssues) {
        order++;
        const sev = issue.severity as IssueSeverity;
        issues.push({ severity: sev, priority_order: order, correction_bucket: assignBucket(sev, issue.category), category: issue.category, meal_type: issue.meal_type, day: issue.day, message: issue.message, suggested_fix: issue.suggested_fix, penalty: issue.penalty });
    }
    issues.sort((a, b) => { const sp = SEV_PRIORITY[a.severity] - SEV_PRIORITY[b.severity]; return sp !== 0 ? sp : b.penalty - a.penalty; });
    issues.forEach((issue, idx) => { issue.priority_order = idx + 1; });
    return issues;
}

function groupByBucketInternal(issues: PrioritizedIssue[]) {
    return {
        bloquear_publicacao: issues.filter(i => i.correction_bucket === "bloquear_publicacao"),
        corrigir_agora: issues.filter(i => i.correction_bucket === "corrigir_agora"),
        corrigir_depois: issues.filter(i => i.correction_bucket === "corrigir_depois"),
        opcional: issues.filter(i => i.correction_bucket === "opcional"),
    };
}

function computeFinalDecisionInternal(overallScore: number, overallPassed: boolean, issues: PrioritizedIssue[]) {
    const hasCritical = issues.some(i => i.severity === "critical");
    if (overallPassed && !hasCritical) {
        return { decision: "publish_now" as const, reason: "Plano aprovado em todas as dimensões.", confidence: (overallScore >= 85 ? "high" : overallScore >= 75 ? "medium" : "low") as const };
    }
    const blockingCount = issues.filter(i => i.correction_bucket === "bloquear_publicacao").length;
    return { decision: "suggest_corrections" as const, reason: `${blockingCount} sugestão(ões) de melhoria encontrada(s). Aplique as correções ou publique como está.`, confidence: (hasCritical ? "high" : "medium") as const };
}

function generateExecutiveSummaryInternal(
    overallPassed: boolean, overallScore: number, clinicalScore: number, simplicityScore: number, adherenceScore: number,
    blockedFoodsCount: number, restrictionsViolatedCount: number, issues: PrioritizedIssue[]
) {
    const criticalCount = issues.filter(i => i.severity === "critical").length;
    const highCount = issues.filter(i => i.severity === "high").length;
    if (overallPassed) {
        return { summary: `Plano aprovado com score ${overallScore}/100. Todas as dimensões dentro dos padrões.`, recommendation: "publicar", strategy: [] as string[] };
    }
    const reasons: string[] = [];
    const strategy: string[] = [];
    if (restrictionsViolatedCount > 0) { reasons.push("restrições alimentares violadas"); strategy.push("Remover alimentos que violam restrições"); }
    if (blockedFoodsCount > 0) { reasons.push("alimentos de baixa aderência"); strategy.push("Substituir alimentos bloqueados por alternativas brasileiras"); }
    if (clinicalScore < 75) { reasons.push("divergências nutricionais"); strategy.push("Ajustar quantidades de macros"); }
    if (simplicityScore < 75) { reasons.push("complexidade acima do aceitável"); strategy.push("Simplificar café da manhã e lanches"); }
    if (adherenceScore < 65) { reasons.push("previsão de adesão baixa"); strategy.push("Reduzir complexidade geral"); }
    return {
        summary: `Plano com sugestões de melhoria (${overallScore}/100): ${reasons.join(", ")}. ${criticalCount} prioritária(s), ${highCount} alto(s).`,
        recommendation: "aplicar_sugestoes",
        strategy,
    };
}
