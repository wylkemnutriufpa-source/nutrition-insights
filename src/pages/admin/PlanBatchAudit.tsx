import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShieldCheck, Loader2, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, ArrowRight, ChevronDown, ChevronUp, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BLOCKED_FOODS,
  SUBSTITUTION_GROUPS,
  ALLOWED_PROTEINS,
  ALLOWED_CARBS,
  ALLOWED_DAIRY,
  ALLOWED_FRUITS,
} from "@/lib/mealPlanFoodRules";

// ── Types ──
interface AuditedPlan {
  plan_id: string;
  title: string;
  plan_status: string;
  patient_id: string;
  patient_name: string;
  score: number;
  blocked_count: number;
  blocked_foods: string[];
  items: PlanItem[];
}

interface PlanItem {
  id: string;
  description: string;
  title: string;
  meal_type: string;
  day_of_week: number;
  calories_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
}

interface BatchReport {
  total: number;
  rejected: number;
  avgScore: number;
  topBlocked: [string, number][];
  patientsImpacted: number;
  plans: AuditedPlan[];
}

interface Reformulation {
  planId: string;
  original: AuditedPlan;
  newItems: ReformulatedItem[];
  removedFoods: string[];
  substitutions: SubstitutionRecord[];
  oldScore: number;
  newScore: number;
}

interface ReformulatedItem extends PlanItem {
  wasModified: boolean;
  originalDescription?: string;
}

interface SubstitutionRecord {
  original: string;
  replacement: string;
  meal: string;
  day: number;
}

// ── Helpers ──
function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function findBlockedInText(text: string): string[] {
  const n = normalize(text);
  return BLOCKED_FOODS.filter(b => n.includes(normalize(b)));
}

const SUBSTITUTION_MAP: Record<string, string> = {
  "salmão": "tilápia grelhada",
  "salmon": "tilápia grelhada",
  "atum fresco": "sardinha",
  "kefir": "iogurte natural",
  "cottage": "queijo minas",
  "ricota importada": "queijo minas",
  "quinoa": "arroz integral",
  "quinua": "arroz integral",
  "amaranto": "aveia",
  "castanha-do-pará": "amendoim torrado",
  "castanha do pará": "amendoim torrado",
  "macadâmia": "castanha de caju",
  "pistache": "amendoim torrado",
  "framboesa": "morango",
  "mirtilo": "morango",
  "blueberry": "morango",
  "cranberry": "morango",
  "açaí premium": "açaí",
  "tofu": "ovo cozido",
  "tempeh": "ovo cozido",
  "edamame": "feijão verde",
  "granola premium": "granola simples",
  "mix de nuts": "amendoim torrado",
  "trail mix": "amendoim torrado",
  "azeite trufado": "azeite de oliva",
  "vinagre balsâmico": "limão",
  "pasta de amendoim importada": "pasta de amendoim",
  "manteiga de amêndoa": "pasta de amendoim",
  "whey protein": "ovo cozido",
  "whey": "iogurte natural",
  "caseína": "leite desnatado",
  "creatina": "",
  "wrap integral": "tapioca",
  "pão artesanal": "pão integral",
  "leite de amêndoa": "leite desnatado",
  "leite de coco": "leite desnatado",
  "leite de aveia": "leite desnatado",
  "abacate toast": "pão com ovo",
  "overnight oats": "aveia com banana",
  "cream cheese": "requeijão",
  "philadelphia": "requeijão",
  "iogurte grego importado": "iogurte natural",
  "iogurte grego": "iogurte natural",
  "coalhada": "iogurte natural",
  "kombucha": "chá",
  "semente de chia importada": "chia",
  "hemp seed": "linhaça",
  "tahini": "pasta de amendoim",
  "tahine": "pasta de amendoim",
  "hummus": "feijão",
  "burrata": "queijo minas",
  "brie": "queijo minas",
  "camembert": "queijo minas",
  "gorgonzola": "queijo muçarela",
};

function reformulateDescription(desc: string): { newDesc: string; subs: { original: string; replacement: string }[] } {
  let result = desc;
  const subs: { original: string; replacement: string }[] = [];
  const blocked = findBlockedInText(desc);

  for (const food of blocked) {
    const replacement = SUBSTITUTION_MAP[food.toLowerCase()] || "";
    if (replacement) {
      // Case-insensitive replace preserving context
      const regex = new RegExp(food.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
      result = result.replace(regex, replacement);
      subs.push({ original: food, replacement });
    } else {
      // Remove the food entirely
      const regex = new RegExp(`[•\\-]?\\s*[^•\\n]*${food.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^•\\n]*`, "gi");
      result = result.replace(regex, "");
      subs.push({ original: food, replacement: "(removido)" });
    }
  }

  return { newDesc: result.replace(/\n{3,}/g, "\n\n").trim(), subs };
}

// ── Components ──
function StatCard({ label, value, color = "text-foreground", sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <Card className="glass border-border/50">
      <CardContent className="p-4 text-center">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function BlockedFoodRanking({ items }: { items: [string, number][] }) {
  const max = items[0]?.[1] || 1;
  return (
    <div className="space-y-2">
      {items.slice(0, 10).map(([food, count]) => (
        <div key={food} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="capitalize font-medium">{food}</span>
            <span className="text-muted-foreground">{count}x</span>
          </div>
          <Progress value={(count / max) * 100} className="h-1.5 [&>div]:bg-orange-500" />
        </div>
      ))}
    </div>
  );
}

function ComparisonView({ reform }: { reform: Reformulation }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl border border-border/50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30 cursor-pointer"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">{reform.oldScore}</Badge>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">{reform.newScore}</Badge>
          </div>
          <span className="text-sm font-medium truncate">{reform.original.title}</span>
          <span className="text-xs text-muted-foreground">({reform.original.patient_name || reform.original.patient_id.slice(0, 8)})</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px]">{reform.substitutions.length} subs</Badge>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-4 space-y-4">
              {/* Substitutions */}
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Substituições Aplicadas</h5>
                <div className="space-y-1">
                  {reform.substitutions.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-red-400 line-through">{s.original}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-emerald-400">{s.replacement}</span>
                      <span className="text-muted-foreground ml-auto">dia {s.day + 1} • {s.meal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Removed foods */}
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Alimentos Removidos</h5>
                <div className="flex flex-wrap gap-1">
                  {reform.removedFoods.map(f => (
                    <Badge key={f} variant="outline" className="text-[10px] border-red-500/20 text-red-400 capitalize">{f}</Badge>
                  ))}
                </div>
              </div>

              {/* Modified items */}
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Itens Modificados ({reform.newItems.filter(i => i.wasModified).length})
                </h5>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {reform.newItems.filter(i => i.wasModified).map(item => (
                    <div key={item.id} className="text-xs p-2 rounded-lg bg-muted/30 border border-border/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[9px]">Dia {item.day_of_week + 1}</Badge>
                        <span className="font-medium">{item.title || item.meal_type}</span>
                      </div>
                      {item.originalDescription && (
                        <p className="text-red-400/60 line-through text-[10px] mb-1">{item.originalDescription.slice(0, 120)}...</p>
                      )}
                      <p className="text-emerald-400/80 text-[10px]">{item.description.slice(0, 120)}...</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ──
export default function PlanBatchAudit() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BatchReport | null>(null);
  const [reformulations, setReformulations] = useState<Reformulation[]>([]);
  const [reformulating, setReformulating] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "rejected" | "active">("all");

  const runBatchAudit = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all plans with items
      const { data: plans, error: plansErr } = await supabase
        .from("meal_plans")
        .select("id, title, plan_status, patient_id")
        .order("created_at", { ascending: false });

      if (plansErr) throw plansErr;

      const auditedPlans: AuditedPlan[] = [];
      const blockedFreq: Record<string, number> = {};
      const patientSet = new Set<string>();

      // Batch fetch items (max 1000)
      const planIds = (plans || []).map(p => p.id);
      const { data: allItems } = await supabase
        .from("meal_plan_items")
        .select("id, meal_plan_id, description, title, meal_type, day_of_week, calories_target, protein_target, carbs_target, fat_target")
        .in("meal_plan_id", planIds.slice(0, 100));

      // Fetch patient names
      const patientIds = [...new Set((plans || []).map(p => p.patient_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", patientIds.slice(0, 100));

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach(p => { if (p.full_name) nameMap[p.id] = p.full_name; });

      const itemsByPlan: Record<string, PlanItem[]> = {};
      (allItems || []).forEach(item => {
        if (!itemsByPlan[item.meal_plan_id]) itemsByPlan[item.meal_plan_id] = [];
        itemsByPlan[item.meal_plan_id].push(item as any);
      });

      for (const plan of (plans || [])) {
        const items = itemsByPlan[plan.id] || [];
        if (items.length === 0) continue;

        const allBlocked: string[] = [];
        for (const item of items) {
          const found = findBlockedInText(item.description || "");
          found.forEach(f => {
            allBlocked.push(f);
            blockedFreq[f] = (blockedFreq[f] || 0) + 1;
          });
        }

        const uniqueBlocked = [...new Set(allBlocked)];
        const penalty = Math.min(40, allBlocked.length * 3);
        const score = uniqueBlocked.length > 0 ? Math.max(0, 100 - penalty) : 100;

        if (uniqueBlocked.length > 0) patientSet.add(plan.patient_id);

        auditedPlans.push({
          plan_id: plan.id,
          title: plan.title || "Sem título",
          plan_status: plan.plan_status || "draft",
          patient_id: plan.patient_id,
          patient_name: nameMap[plan.patient_id] || plan.patient_id.slice(0, 8),
          score,
          blocked_count: allBlocked.length,
          blocked_foods: uniqueBlocked,
          items,
        });
      }

      const rejectedCount = auditedPlans.filter(p => p.blocked_count > 0).length;
      const avgScore = auditedPlans.length > 0
        ? Math.round(auditedPlans.reduce((s, p) => s + p.score, 0) / auditedPlans.length)
        : 0;
      const topBlocked = Object.entries(blockedFreq).sort((a, b) => b[1] - a[1]);

      setReport({
        total: auditedPlans.length,
        rejected: rejectedCount,
        avgScore,
        topBlocked,
        patientsImpacted: patientSet.size,
        plans: auditedPlans,
      });

      toast.success(`Auditoria concluída: ${auditedPlans.length} planos analisados`);
    } catch (e: any) {
      toast.error("Erro na auditoria: " + e.message);
    }
    setLoading(false);
  }, []);

  const reformulateAll = useCallback(async () => {
    if (!report) return;
    setReformulating(true);

    const rejected = report.plans.filter(p => p.blocked_count > 0);
    const results: Reformulation[] = [];

    for (const plan of rejected) {
      const newItems: ReformulatedItem[] = [];
      const allSubs: SubstitutionRecord[] = [];
      const allRemoved = new Set<string>();

      for (const item of plan.items) {
        const blocked = findBlockedInText(item.description || "");
        if (blocked.length === 0) {
          newItems.push({ ...item, wasModified: false });
          continue;
        }

        const { newDesc, subs } = reformulateDescription(item.description || "");
        subs.forEach(s => {
          allSubs.push({ original: s.original, replacement: s.replacement, meal: item.title || item.meal_type, day: item.day_of_week });
          allRemoved.add(s.original);
        });

        newItems.push({
          ...item,
          description: newDesc,
          wasModified: true,
          originalDescription: item.description,
        });
      }

      // Recalc score
      let remainingBlocked = 0;
      for (const ni of newItems) {
        remainingBlocked += findBlockedInText(ni.description).length;
      }
      const newScore = remainingBlocked === 0 ? 100 : Math.max(0, 100 - remainingBlocked * 3);

      results.push({
        planId: plan.plan_id,
        original: plan,
        newItems,
        removedFoods: [...allRemoved],
        substitutions: allSubs,
        oldScore: plan.score,
        newScore,
      });
    }

    setReformulations(results);
    setReformulating(false);
    toast.success(`${results.length} planos reformulados. Revise e salve.`);
  }, [report]);

  const saveReformulation = useCallback(async (reform: Reformulation) => {
    setSaving(reform.planId);
    try {
      // Create a new plan as draft copy
      const { data: originalPlan } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("id", reform.planId)
        .single();

      if (!originalPlan) throw new Error("Plano original não encontrado");

      const { data: newPlan, error: insertErr } = await supabase
        .from("meal_plans")
        .insert({
          patient_id: originalPlan.patient_id,
          nutritionist_id: originalPlan.nutritionist_id,
          title: `${originalPlan.title} (Reformulado v3)`,
          plan_status: "draft_auto_generated" as any,
          total_target_calories: originalPlan.total_target_calories,
          total_target_protein: originalPlan.total_target_protein,
          total_target_carbs: originalPlan.total_target_carbs,
          total_target_fat: originalPlan.total_target_fat,
          template_id: originalPlan.template_id,
          tenant_id: originalPlan.tenant_id,
        })
        .select("id")
        .single();

      if (insertErr || !newPlan) throw insertErr || new Error("Erro ao criar plano");

      // Insert reformulated items
      const itemsToInsert = reform.newItems.map(item => ({
        meal_plan_id: newPlan.id,
        meal_type: item.meal_type,
        title: item.title,
        description: item.description,
        day_of_week: item.day_of_week,
        calories_target: item.calories_target,
        protein_target: item.protein_target,
        carbs_target: item.carbs_target,
        fat_target: item.fat_target,
      }));

      const { error: itemsErr } = await supabase
        .from("meal_plan_items")
        .insert(itemsToInsert);

      if (itemsErr) throw itemsErr;

      toast.success(`Plano reformulado salvo como draft: "${originalPlan.title} (Reformulado v3)"`);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    }
    setSaving(null);
  }, []);

  const filteredPlans = report?.plans.filter(p => {
    if (filter === "rejected") return p.blocked_count > 0;
    if (filter === "active") return ["approved", "published", "published_to_patient"].includes(p.plan_status);
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Auditoria em Lote — Motor v3.0
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audite, identifique e corrija planos com alimentos inadequados
          </p>
        </div>
        <Button onClick={runBatchAudit} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {loading ? "Auditando..." : "Executar Auditoria"}
        </Button>
      </div>

      {report && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="plans">Planos ({filteredPlans.length})</TabsTrigger>
            <TabsTrigger value="reformulate">Reformulação</TabsTrigger>
            {reformulations.length > 0 && (
              <TabsTrigger value="comparison">Comparação ({reformulations.length})</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatCard label="Total Auditados" value={report.total} />
              <StatCard label="Reprovados" value={report.rejected} color="text-red-400" sub={`${Math.round((report.rejected / report.total) * 100)}%`} />
              <StatCard label="Score Médio" value={report.avgScore} color={report.avgScore >= 80 ? "text-emerald-400" : "text-orange-400"} />
              <StatCard label="Pacientes" value={report.patientsImpacted} color="text-amber-400" />
              <StatCard label="Alim. Únicos" value={report.topBlocked.length} color="text-orange-400" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    Top Alimentos Problemáticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BlockedFoodRanking items={report.topBlocked} />
                </CardContent>
              </Card>

              <Card className="glass border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribuição de Scores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Score 90-100 (Aprovado)", range: [90, 100], color: "bg-emerald-500" },
                    { label: "Score 70-89 (Marginal)", range: [70, 89], color: "bg-amber-500" },
                    { label: "Score 50-69 (Reprovado)", range: [50, 69], color: "bg-orange-500" },
                    { label: "Score 0-49 (Crítico)", range: [0, 49], color: "bg-red-500" },
                  ].map(tier => {
                    const count = report.plans.filter(p => p.score >= tier.range[0] && p.score <= tier.range[1]).length;
                    const pct = report.total > 0 ? (count / report.total) * 100 : 0;
                    return (
                      <div key={tier.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{tier.label}</span>
                          <span className="text-muted-foreground">{count} ({Math.round(pct)}%)</span>
                        </div>
                        <Progress value={pct} className={`h-1.5 [&>div]:${tier.color}`} />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-3">
            <div className="flex gap-2">
              {(["all", "rejected", "active"] as const).map(f => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)} className="text-xs gap-1">
                  <Filter className="w-3 h-3" />
                  {f === "all" ? "Todos" : f === "rejected" ? "Reprovados" : "Ativos"}
                </Button>
              ))}
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredPlans.map(plan => (
                <div key={plan.plan_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${plan.blocked_count > 0 ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}
                >
                  {plan.blocked_count > 0
                    ? <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{plan.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.patient_name} • {plan.plan_status}
                    </p>
                  </div>
                  <Badge className={`text-[10px] ${plan.score >= 90 ? "bg-emerald-500/10 text-emerald-400" : plan.score >= 70 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`} variant="outline">
                    {plan.score}
                  </Badge>
                  {plan.blocked_count > 0 && (
                    <div className="hidden sm:flex gap-1">
                      {plan.blocked_foods.slice(0, 3).map(f => (
                        <Badge key={f} variant="outline" className="text-[9px] border-orange-500/20 text-orange-400 capitalize">{f}</Badge>
                      ))}
                      {plan.blocked_foods.length > 3 && (
                        <Badge variant="outline" className="text-[9px]">+{plan.blocked_foods.length - 3}</Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Reformulate Tab */}
          <TabsContent value="reformulate" className="space-y-4">
            <Card className="glass border-border/50">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  Reformulação Automática
                </h3>
                <p className="text-xs text-muted-foreground">
                  Processa todos os planos reprovados, substituindo alimentos bloqueados por equivalentes populares.
                  Cada plano reformulado é salvo como <strong>nova versão draft</strong>, preservando o original.
                </p>
                <div className="flex gap-3">
                  <Button onClick={reformulateAll} disabled={reformulating || report.rejected === 0} className="gap-2">
                    {reformulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {reformulating ? "Reformulando..." : `Reformular ${report.rejected} plano(s)`}
                  </Button>
                </div>
                {report.rejected === 0 && (
                  <p className="text-xs text-emerald-400">✅ Nenhum plano precisa de reformulação!</p>
                )}
              </CardContent>
            </Card>

            {reformulations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{reformulations.length} planos reformulados</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Score médio: {Math.round(reformulations.reduce((s, r) => s + r.oldScore, 0) / reformulations.length)} → {Math.round(reformulations.reduce((s, r) => s + r.newScore, 0) / reformulations.length)}
                    </Badge>
                  </div>
                </div>
                {reformulations.map(r => (
                  <div key={r.planId} className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">{r.oldScore}</Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">{r.newScore}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.original.title}</p>
                      <p className="text-xs text-muted-foreground">{r.substitutions.length} substituições</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 shrink-0"
                      onClick={() => saveReformulation(r)} disabled={saving !== null}>
                      {saving === r.planId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Salvar Draft
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Comparison Tab */}
          {reformulations.length > 0 && (
            <TabsContent value="comparison" className="space-y-3">
              <h3 className="text-sm font-semibold">Comparação Antes × Depois</h3>
              {reformulations.map(r => <ComparisonView key={r.planId} reform={r} />)}
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Empty state */}
      {!report && !loading && (
        <Card className="glass border-border/50">
          <CardContent className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="font-semibold text-lg mb-2">Auditoria em Lote</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Clique em <strong>Executar Auditoria</strong> para escanear todos os planos alimentares,
              identificar alimentos inadequados e gerar relatório completo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
