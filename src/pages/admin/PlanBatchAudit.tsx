import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShieldCheck, Loader2, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, ArrowRight, ChevronDown, ChevronUp, Filter,
  ExternalLink, Square, CheckSquare, Zap, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BLOCKED_FOODS } from "@/lib/mealPlanFoodRules";

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
  priority: number;
  severity: "critical" | "high" | "medium" | "ok";
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
  savedPlanId?: string;
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
  "salmão": "tilápia grelhada", "salmon": "tilápia grelhada", "atum fresco": "sardinha",
  "kefir": "iogurte natural", "cottage": "queijo minas", "ricota importada": "queijo minas",
  "quinoa": "arroz integral", "quinua": "arroz integral", "amaranto": "aveia",
  "castanha-do-pará": "amendoim torrado", "castanha do pará": "amendoim torrado",
  "macadâmia": "castanha de caju", "pistache": "amendoim torrado",
  "framboesa": "morango", "mirtilo": "morango", "blueberry": "morango",
  "cranberry": "morango", "açaí premium": "açaí",
  "tofu": "ovo cozido", "tempeh": "ovo cozido", "edamame": "feijão verde",
  "granola premium": "granola simples", "mix de nuts": "amendoim torrado",
  "trail mix": "amendoim torrado", "azeite trufado": "azeite de oliva",
  "vinagre balsâmico": "limão", "pasta de amendoim importada": "pasta de amendoim",
  "manteiga de amêndoa": "pasta de amendoim",
  "whey protein": "ovo cozido", "whey": "iogurte natural",
  "caseína": "leite desnatado", "creatina": "",
  "wrap integral": "tapioca", "pão artesanal": "pão integral",
  "leite de amêndoa": "leite desnatado", "leite de coco": "leite desnatado",
  "leite de aveia": "leite desnatado", "abacate toast": "pão com ovo",
  "overnight oats": "aveia com banana",
  "cream cheese": "requeijão", "philadelphia": "requeijão",
  "iogurte grego importado": "iogurte natural", "iogurte grego": "iogurte natural",
  "coalhada": "iogurte natural", "kombucha": "chá",
  "semente de chia importada": "chia", "hemp seed": "linhaça",
  "tahini": "pasta de amendoim", "tahine": "pasta de amendoim", "hummus": "feijão",
  "burrata": "queijo minas", "brie": "queijo minas",
  "camembert": "queijo minas", "gorgonzola": "queijo muçarela",
};

function reformulateDescription(desc: string): { newDesc: string; subs: { original: string; replacement: string }[] } {
  let result = desc;
  const subs: { original: string; replacement: string }[] = [];
  const blocked = findBlockedInText(desc);
  for (const food of blocked) {
    const replacement = SUBSTITUTION_MAP[food.toLowerCase()] || "";
    if (replacement) {
      const regex = new RegExp(food.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
      result = result.replace(regex, replacement);
      subs.push({ original: food, replacement });
    } else {
      const regex = new RegExp(`[•\\-]?\\s*[^•\\n]*${food.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^•\\n]*`, "gi");
      result = result.replace(regex, "");
      subs.push({ original: food, replacement: "(removido)" });
    }
  }
  return { newDesc: result.replace(/\n{3,}/g, "\n\n").trim(), subs };
}

function getSeverity(score: number): "critical" | "high" | "medium" | "ok" {
  if (score < 70) return "critical";
  if (score < 80) return "high";
  if (score < 90) return "medium";
  return "ok";
}

function getPriorityScore(plan: { plan_status: string; score: number; blocked_count: number }): number {
  let p = 0;
  // Active/published plans are highest priority
  if (["published_to_patient", "published", "approved"].includes(plan.plan_status)) p += 100;
  // Lower score = higher priority
  p += (100 - plan.score);
  // More blocked foods = higher priority
  p += plan.blocked_count * 2;
  return p;
}

const SEVERITY_CONFIG = {
  critical: { label: "CRÍTICO", dotClass: "bg-destructive", badgeClass: "border-destructive/30 bg-destructive/10 text-destructive", rowClass: "border-destructive/30 bg-destructive/5" },
  high: { label: "ALTO", dotClass: "bg-orange-500", badgeClass: "border-orange-500/30 bg-orange-500/10 text-orange-500", rowClass: "border-orange-500/30 bg-orange-500/5" },
  medium: { label: "MÉDIO", dotClass: "bg-amber-500", badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-500", rowClass: "border-amber-500/30 bg-amber-500/5" },
  ok: { label: "OK", dotClass: "bg-emerald-500", badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500", rowClass: "border-emerald-500/30 bg-emerald-500/5" },
};

// ── Sub-components ──
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

function ComparisonView({ reform, onOpenDraft }: { reform: Reformulation; onOpenDraft: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl border border-border/50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30 cursor-pointer"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={SEVERITY_CONFIG[reform.original.severity].badgeClass + " text-[10px]"}>{reform.oldScore}</Badge>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[10px]">{reform.newScore}</Badge>
          </div>
          <span className="text-sm font-medium truncate">{reform.original.title}</span>
          <span className="text-xs text-muted-foreground">({reform.original.patient_name})</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px]">{reform.substitutions.length} subs</Badge>
          {reform.savedPlanId && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); onOpenDraft(reform.savedPlanId!); }}>
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
            </Button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-4 space-y-4">
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Substituições Aplicadas</h5>
                <div className="space-y-1">
                  {reform.substitutions.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-destructive line-through">{s.original}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-emerald-500">{s.replacement}</span>
                      <span className="text-muted-foreground ml-auto">dia {s.day + 1} • {s.meal}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Alimentos Removidos</h5>
                <div className="flex flex-wrap gap-1">
                  {reform.removedFoods.map(f => (
                    <Badge key={f} variant="outline" className="text-[10px] border-destructive/20 text-destructive capitalize">{f}</Badge>
                  ))}
                </div>
              </div>
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
                        <p className="text-destructive/60 line-through text-[10px] mb-1">{item.originalDescription.slice(0, 120)}...</p>
                      )}
                      <p className="text-emerald-500/80 text-[10px]">{item.description.slice(0, 120)}...</p>
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BatchReport | null>(null);
  const [reformulations, setReformulations] = useState<Reformulation[]>([]);
  const [reformulating, setReformulating] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [savingBatch, setSavingBatch] = useState(false);
  const [filter, setFilter] = useState<"all" | "rejected" | "active" | "critical" | "high">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const ids = filteredPlans.filter(p => p.blocked_count > 0).map(p => p.plan_id);
    setSelected(prev => {
      const allSelected = ids.every(id => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  };

  const runBatchAudit = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    setReformulations([]);
    try {
      const { data: plans, error: plansErr } = await supabase
        .from("meal_plans")
        .select("id, title, plan_status, patient_id")
        .order("created_at", { ascending: false });
      if (plansErr) throw plansErr;

      const planIds = (plans || []).map(p => p.id);
      const { data: allItems } = await supabase
        .from("meal_plan_items")
        .select("id, meal_plan_id, description, title, meal_type, day_of_week, calories_target, protein_target, carbs_target, fat_target")
        .in("meal_plan_id", planIds.slice(0, 100));

      const patientIds = [...new Set((plans || []).map(p => p.patient_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds.slice(0, 100));

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach(p => { if (p.full_name) nameMap[p.user_id] = p.full_name; });

      const itemsByPlan: Record<string, PlanItem[]> = {};
      (allItems || []).forEach(item => {
        if (!itemsByPlan[item.meal_plan_id]) itemsByPlan[item.meal_plan_id] = [];
        itemsByPlan[item.meal_plan_id].push(item as any);
      });

      const auditedPlans: AuditedPlan[] = [];
      const blockedFreq: Record<string, number> = {};
      const patientSet = new Set<string>();

      for (const plan of (plans || [])) {
        const items = itemsByPlan[plan.id] || [];
        if (items.length === 0) continue;

        const allBlocked: string[] = [];
        for (const item of items) {
          findBlockedInText(item.description || "").forEach(f => {
            allBlocked.push(f);
            blockedFreq[f] = (blockedFreq[f] || 0) + 1;
          });
        }

        const uniqueBlocked = [...new Set(allBlocked)];
        const penalty = Math.min(40, allBlocked.length * 3);
        const score = uniqueBlocked.length > 0 ? Math.max(0, 100 - penalty) : 100;
        const severity = getSeverity(score);
        const priority = uniqueBlocked.length > 0 ? getPriorityScore({ plan_status: plan.plan_status || "", score, blocked_count: allBlocked.length }) : 0;

        if (uniqueBlocked.length > 0) patientSet.add(plan.patient_id);

        auditedPlans.push({
          plan_id: plan.id,
          title: plan.title || "Sem título",
          plan_status: plan.plan_status || "draft",
          patient_id: plan.patient_id,
          patient_name: nameMap[plan.patient_id] || plan.patient_id.slice(0, 8),
          score, blocked_count: allBlocked.length, blocked_foods: uniqueBlocked,
          items, priority, severity,
        });
      }

      // Sort by priority descending
      auditedPlans.sort((a, b) => b.priority - a.priority);

      const rejectedCount = auditedPlans.filter(p => p.blocked_count > 0).length;
      const avgScore = auditedPlans.length > 0
        ? Math.round(auditedPlans.reduce((s, p) => s + p.score, 0) / auditedPlans.length)
        : 0;

      setReport({
        total: auditedPlans.length,
        rejected: rejectedCount,
        avgScore,
        topBlocked: Object.entries(blockedFreq).sort((a, b) => b[1] - a[1]),
        patientsImpacted: patientSet.size,
        plans: auditedPlans,
      });
      toast.success(`Auditoria concluída: ${auditedPlans.length} planos analisados`);
    } catch (e: any) {
      toast.error("Erro na auditoria: " + e.message);
    }
    setLoading(false);
  }, []);

  const filteredPlans = useMemo(() => {
    if (!report) return [];
    return report.plans.filter(p => {
      if (filter === "rejected") return p.blocked_count > 0;
      if (filter === "active") return ["approved", "published", "published_to_patient"].includes(p.plan_status);
      if (filter === "critical") return p.severity === "critical";
      if (filter === "high") return p.severity === "high";
      return true;
    });
  }, [report, filter]);

  const reformulateSelected = useCallback(async () => {
    if (!report) return;
    setReformulating(true);

    const targets = selected.size > 0
      ? report.plans.filter(p => selected.has(p.plan_id) && p.blocked_count > 0)
      : report.plans.filter(p => p.blocked_count > 0);

    const results: Reformulation[] = [];
    for (const plan of targets) {
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
        newItems.push({ ...item, description: newDesc, wasModified: true, originalDescription: item.description });
      }

      let remainingBlocked = 0;
      for (const ni of newItems) remainingBlocked += findBlockedInText(ni.description).length;
      const newScore = remainingBlocked === 0 ? 100 : Math.max(0, 100 - remainingBlocked * 3);

      results.push({
        planId: plan.plan_id, original: plan, newItems,
        removedFoods: [...allRemoved], substitutions: allSubs,
        oldScore: plan.score, newScore,
      });
    }

    setReformulations(results);
    setReformulating(false);
    toast.success(`${results.length} planos reformulados. Revise e salve.`);
  }, [report, selected]);

  const saveReformulation = useCallback(async (reform: Reformulation): Promise<string | null> => {
    try {
      const { data: originalPlan } = await supabase
        .from("meal_plans").select("*").eq("id", reform.planId).single();
      if (!originalPlan) throw new Error("Plano original não encontrado");

      const { data: newPlan, error: insertErr } = await supabase
        .from("meal_plans")
        .insert([{
          patient_id: originalPlan.patient_id,
          nutritionist_id: originalPlan.nutritionist_id,
          title: `${originalPlan.title} (Reformulado v3)`,
          plan_status: "draft_auto_generated",
          start_date: new Date().toISOString().split("T")[0],
          total_target_calories: originalPlan.total_target_calories,
          total_target_protein: originalPlan.total_target_protein,
          total_target_carbs: originalPlan.total_target_carbs,
          total_target_fat: originalPlan.total_target_fat,
          template_id: originalPlan.template_id,
          tenant_id: originalPlan.tenant_id,
        }])
        .select("id").single();
      if (insertErr || !newPlan) throw insertErr || new Error("Erro ao criar plano");

      const itemsToInsert = reform.newItems.map(item => ({
        meal_plan_id: newPlan.id,
        meal_type: item.meal_type as any,
        title: item.title,
        description: item.description,
        day_of_week: item.day_of_week,
        calories_target: item.calories_target,
        protein_target: item.protein_target,
        carbs_target: item.carbs_target,
        fat_target: item.fat_target,
      }));
      const { error: itemsErr } = await supabase.from("meal_plan_items").insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      return newPlan.id;
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
      return null;
    }
  }, []);

  const saveSingle = useCallback(async (reform: Reformulation) => {
    setSaving(reform.planId);
    const newId = await saveReformulation(reform);
    if (newId) {
      setReformulations(prev => prev.map(r => r.planId === reform.planId ? { ...r, savedPlanId: newId } : r));
      toast.success(`Draft salvo! Abra no editor para revisar.`);
    }
    setSaving(null);
  }, [saveReformulation]);

  const saveBatch = useCallback(async () => {
    setSavingBatch(true);
    let saved = 0;
    const updated: Reformulation[] = [...reformulations];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].savedPlanId) continue;
      const newId = await saveReformulation(updated[i]);
      if (newId) {
        updated[i] = { ...updated[i], savedPlanId: newId };
        saved++;
      }
    }
    setReformulations(updated);
    setSavingBatch(false);
    toast.success(`${saved} planos salvos como draft!`);
  }, [reformulations, saveReformulation]);

  const openDraft = (planId: string) => navigate(`/meal-plans/${planId}`);

  const selectedCount = selected.size;
  const rejectedInFilter = filteredPlans.filter(p => p.blocked_count > 0).length;

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
            Audite, priorize e corrija planos com alimentos inadequados
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

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatCard label="Total Auditados" value={report.total} />
              <StatCard label="Reprovados" value={report.rejected} color="text-destructive" sub={`${Math.round((report.rejected / report.total) * 100)}%`} />
              <StatCard label="Score Médio" value={report.avgScore} color={report.avgScore >= 80 ? "text-emerald-500" : "text-orange-500"} />
              <StatCard label="Pacientes" value={report.patientsImpacted} color="text-amber-500" />
              <StatCard label="Alim. Únicos" value={report.topBlocked.length} color="text-orange-500" />
            </div>

            {/* Severity breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["critical", "high", "medium", "ok"] as const).map(sev => {
                const count = report.plans.filter(p => p.severity === sev).length;
                const cfg = SEVERITY_CONFIG[sev];
                return (
                  <Card key={sev} className={`glass border ${cfg.rowClass} cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={() => setFilter(sev === "ok" ? "all" : sev === "medium" ? "rejected" : sev)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${cfg.dotClass}`} />
                      <div>
                        <p className="text-xs font-semibold">{cfg.label}</p>
                        <p className="text-lg font-bold">{count}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Top Alimentos Problemáticos
                  </CardTitle>
                </CardHeader>
                <CardContent><BlockedFoodRanking items={report.topBlocked} /></CardContent>
              </Card>

              <Card className="glass border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribuição de Scores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Score 90-100 (Aprovado)", range: [90, 100], cls: "[&>div]:bg-emerald-500" },
                    { label: "Score 80-89 (Médio)", range: [80, 89], cls: "[&>div]:bg-amber-500" },
                    { label: "Score 70-79 (Alto)", range: [70, 79], cls: "[&>div]:bg-orange-500" },
                    { label: "Score 0-69 (Crítico)", range: [0, 69], cls: "[&>div]:bg-destructive" },
                  ].map(tier => {
                    const count = report.plans.filter(p => p.score >= tier.range[0] && p.score <= tier.range[1]).length;
                    const pct = report.total > 0 ? (count / report.total) * 100 : 0;
                    return (
                      <div key={tier.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{tier.label}</span>
                          <span className="text-muted-foreground">{count} ({Math.round(pct)}%)</span>
                        </div>
                        <Progress value={pct} className={`h-1.5 ${tier.cls}`} />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Plans with multi-select */}
          <TabsContent value="plans" className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                {(["all", "critical", "high", "rejected", "active"] as const).map(f => (
                  <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
                    onClick={() => { setFilter(f); setSelected(new Set()); }} className="text-xs gap-1">
                    {f === "critical" && <div className="w-2 h-2 rounded-full bg-destructive" />}
                    {f === "high" && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    {f === "all" ? "Todos" : f === "critical" ? "Crítico" : f === "high" ? "Alto" : f === "rejected" ? "Reprovados" : "Publicados"}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {rejectedInFilter > 0 && (
                  <Button size="sm" variant="ghost" onClick={selectAllFiltered} className="text-xs gap-1">
                    {selectedCount > 0 && selectedCount === rejectedInFilter ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {selectedCount > 0 ? `${selectedCount} selecionados` : "Selecionar todos"}
                  </Button>
                )}
                {selectedCount > 0 && (
                  <Button size="sm" onClick={reformulateSelected} className="text-xs gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    Reformular {selectedCount}
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {filteredPlans.map(plan => {
                const cfg = SEVERITY_CONFIG[plan.severity];
                const isSelected = selected.has(plan.plan_id);
                return (
                  <div key={plan.plan_id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors ${plan.blocked_count > 0 ? cfg.rowClass : "border-emerald-500/20 bg-emerald-500/5"} ${isSelected ? "ring-1 ring-primary/40" : ""}`}
                  >
                    {plan.blocked_count > 0 && (
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(plan.plan_id)} className="shrink-0" />
                    )}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotClass}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{plan.title}</p>
                        {["published_to_patient", "published", "approved"].includes(plan.plan_status) && (
                          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary shrink-0">ATIVO</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.patient_name} • {plan.plan_status}</p>
                    </div>
                    {plan.blocked_count > 0 && (
                      <Badge variant="outline" className={`${cfg.badgeClass} text-[9px] shrink-0`}>{cfg.label}</Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${plan.score >= 90 ? "text-emerald-500" : plan.score >= 70 ? "text-amber-500" : "text-destructive"}`}>
                      {plan.score}
                    </Badge>
                    {plan.blocked_count > 0 && (
                      <div className="hidden lg:flex gap-1">
                        {plan.blocked_foods.slice(0, 2).map(f => (
                          <Badge key={f} variant="outline" className="text-[9px] border-orange-500/20 text-orange-500 capitalize">{f}</Badge>
                        ))}
                        {plan.blocked_foods.length > 2 && (
                          <Badge variant="outline" className="text-[9px]">+{plan.blocked_foods.length - 2}</Badge>
                        )}
                      </div>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => navigate(`/meal-plans/${plan.plan_id}`)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Reformulate */}
          <TabsContent value="reformulate" className="space-y-4">
            <Card className="glass border-border/50">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  Reformulação Automática
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedCount > 0
                    ? `${selectedCount} plano(s) selecionado(s) para reformulação.`
                    : `Processa todos os ${report.rejected} planos reprovados.`}
                  {" "}Cada plano reformulado é salvo como <strong>nova versão draft</strong>.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button onClick={reformulateSelected} disabled={reformulating || report.rejected === 0} className="gap-2">
                    {reformulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {reformulating ? "Reformulando..." : `Reformular ${selectedCount > 0 ? selectedCount : report.rejected} plano(s)`}
                  </Button>
                  {reformulations.length > 0 && reformulations.some(r => !r.savedPlanId) && (
                    <Button onClick={saveBatch} disabled={savingBatch} variant="outline" className="gap-2">
                      {savingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Salvar Todos como Draft
                    </Button>
                  )}
                </div>
                {report.rejected === 0 && (
                  <p className="text-xs text-emerald-500">✅ Nenhum plano precisa de reformulação!</p>
                )}
              </CardContent>
            </Card>

            {reformulations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{reformulations.length} planos reformulados</h4>
                  <Badge variant="outline" className="text-[10px]">
                    Score: {Math.round(reformulations.reduce((s, r) => s + r.oldScore, 0) / reformulations.length)} → {Math.round(reformulations.reduce((s, r) => s + r.newScore, 0) / reformulations.length)}
                  </Badge>
                </div>
                {reformulations.map(r => (
                  <div key={r.planId} className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={SEVERITY_CONFIG[r.original.severity].badgeClass + " text-[10px]"}>{r.oldScore}</Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[10px]">{r.newScore}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.original.title}</p>
                      <p className="text-xs text-muted-foreground">{r.original.patient_name} • {r.substitutions.length} substituições</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {r.savedPlanId ? (
                        <Button size="sm" variant="outline" className="gap-1.5 border-primary/30" onClick={() => openDraft(r.savedPlanId!)}>
                          <ExternalLink className="w-3.5 h-3.5" /> Abrir Draft
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => saveSingle(r)} disabled={saving !== null}>
                          {saving === r.planId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Salvar Draft
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Comparison */}
          {reformulations.length > 0 && (
            <TabsContent value="comparison" className="space-y-3">
              <h3 className="text-sm font-semibold">Comparação Antes × Depois</h3>
              {reformulations.map(r => <ComparisonView key={r.planId} reform={r} onOpenDraft={openDraft} />)}
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
              identificar alimentos inadequados e gerar relatório priorizado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
