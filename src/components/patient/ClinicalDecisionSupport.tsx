import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenantContext";
import { useFeatureFlag } from "@/lib/featureFlags";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Brain, AlertTriangle, TrendingDown, Zap, RefreshCw,
  Loader2, Target, Shield, Activity, Heart,
  ChevronDown, ChevronUp, Stethoscope, Lightbulb, FileText, Sparkles, Cpu
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  patientId: string;
  nutritionistId: string;
}

interface ClinicalResult {
  clinicalAnalysis: string;
  suggestedAdjustments: string[];
  recommendedProtocols: { title: string; reason: string }[];
  alerts: { type: "abandonment" | "stagnation" | "low_adherence"; message: string; severity: "high" | "medium" | "low" }[];
  copilot_used?: boolean;
}

export default function ClinicalDecisionSupport({ patientId, nutritionistId }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClinicalResult | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("analysis");
  const [useCopilot, setUseCopilot] = useState(false);
  const { tenantId } = useTenant();

  const gatherAndAnalyze = useCallback(async () => {
    setLoading(true);
    try {
      const [
        profileRes, anamnesisRes, checkinsRes, checklistRes,
        assessmentsRes, mealCompletionsRes, protocolsRes, availableProtocolsRes
      ] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", patientId).maybeSingle(),
        withTenantFilter(supabase.from("patient_anamnesis").select("answers, computed_tmb, computed_kcal_target, computed_protein, computed_carbs, computed_fat, status").eq("user_id", patientId).order("created_at", { ascending: false }), tenantId).limit(1),
        supabase.from("patient_checkins").select("weight, difficulty, feedback, status, created_at").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(20),
        withTenantFilter(supabase.from("checklist_tasks").select("completed, date, category").eq("patient_id", patientId).order("date", { ascending: false }), tenantId).limit(90),
        supabase.from("physical_assessments").select("weight, body_fat_percentage, lean_mass, fat_mass, bmi, assessment_date").eq("patient_id", patientId).order("assessment_date", { ascending: false }).limit(5),
        supabase.from("meal_item_completions").select("completed, adherence_status, date").eq("patient_id", patientId).order("date", { ascending: false }).limit(60),
        supabase.from("patient_protocols").select("protocol_id, status, start_date, end_date").eq("patient_id", patientId).eq("nutritionist_id", nutritionistId),
        supabase.from("protocols").select("id, title, category, description").eq("created_by", nutritionistId),
      ]);

      const anamnesis = anamnesisRes.data?.[0] || null;
      const checkins = checkinsRes.data || [];
      const checklist = checklistRes.data || [];
      const assessments = assessmentsRes.data || [];
      const mealCompletions = mealCompletionsRes.data || [];
      const activeProtocols = (protocolsRes.data || []).filter((p: any) => p.status === "active");
      const availableProtocols = availableProtocolsRes.data || [];

      const totalChecklist = checklist.length;
      const completedChecklist = checklist.filter((t: any) => t.completed).length;
      const adherenceRate = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;
      const totalMeals = mealCompletions.length;
      const followedMeals = mealCompletions.filter((m: any) => m.completed).length;
      const mealAdherence = totalMeals > 0 ? Math.round((followedMeals / totalMeals) * 100) : 0;
      const weights = assessments.filter((a: any) => a.weight).map((a: any) => ({ weight: a.weight, date: a.assessment_date }));
      const difficulties = checkins.filter((c: any) => c.difficulty).map((c: any) => c.difficulty);
      const feedbacks = checkins.filter((c: any) => c.feedback).map((c: any) => c.feedback);
      const lastCheckin = checkins[0];
      const daysSinceLastCheckin = lastCheckin ? Math.floor((Date.now() - new Date(lastCheckin.created_at).getTime()) / 86400000) : 999;
      const answers = anamnesis?.answers as Record<string, any> | null;

      const patientData = {
        name: profileRes.data?.full_name || "Paciente",
        anamnesis: anamnesis ? {
          goal: answers?.goal, activityLevel: answers?.activity_level, healthConditions: answers?.health_conditions,
          feeling: answers?.feeling, waterIntake: answers?.water_intake, tmb: anamnesis.computed_tmb,
          kcalTarget: anamnesis.computed_kcal_target, protein: anamnesis.computed_protein,
          carbs: anamnesis.computed_carbs, fat: anamnesis.computed_fat,
        } : null,
        metrics: {
          checklistAdherence: adherenceRate, mealPlanAdherence: mealAdherence, daysSinceLastCheckin,
          totalCheckins: checkins.length, weightHistory: weights, difficulties: difficulties.slice(0, 5),
          recentFeedbacks: feedbacks.slice(0, 3),
        },
        bodyData: assessments[0] ? { bmi: assessments[0].bmi, bodyFat: assessments[0].body_fat_percentage, leanMass: assessments[0].lean_mass, fatMass: assessments[0].fat_mass } : null,
        activeProtocolCount: activeProtocols.length,
        availableProtocols: availableProtocols.map((p: any) => ({ title: p.title, category: p.category, description: p.description })),
      };

      const { data, error } = await supabase.functions.invoke("clinical-decision-support", {
        body: { patientData, useCopilot },
      });

      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      toast.error("Erro ao gerar análise: " + (err.message || "Tente novamente"));
    }
    setLoading(false);
  }, [patientId, nutritionistId, useCopilot]);

  const toggleSection = (key: string) => setExpandedSection(expandedSection === key ? null : key);

  const alertIcon = (type: string) => {
    switch (type) {
      case "abandonment": return <Shield className="w-4 h-4 text-destructive" />;
      case "stagnation": return <TrendingDown className="w-4 h-4 text-warning" />;
      case "low_adherence": return <Activity className="w-4 h-4 text-orange-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-warning" />;
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const SourceBadge = () => {
    if (!result) return null;
    if (result.copilot_used) {
      return (
        <Badge variant="default" className="gap-1 text-[10px] bg-primary/10 text-primary border-primary/20">
          <Sparkles className="w-3 h-3" /> Copiloto IA
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 text-[10px]">
        <Cpu className="w-3 h-3" /> Motor Determinístico
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-lg">Suporte à Decisão Clínica</h3>
          {result && <SourceBadge />}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="copilot" checked={useCopilot} onCheckedChange={setUseCopilot} />
            <Label htmlFor="copilot" className="text-xs flex items-center gap-1 cursor-pointer">
              <Sparkles className="w-3 h-3 text-primary" /> Copiloto IA
            </Label>
          </div>
          <Button onClick={gatherAndAnalyze} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {result ? "Atualizar" : "Gerar Análise"}
          </Button>
        </div>
      </div>

      {!result && !loading && (
        <div className="text-center py-10">
          <Brain className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            Clique em "Gerar Análise" para o motor clínico analisar os dados deste paciente.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {useCopilot ? "Com Copiloto IA ativado (consome créditos)" : "Motor determinístico (sem custo de IA)"}
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-10">
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">
            {useCopilot ? "Analisando com Copiloto IA..." : "Processando com motor clínico..."}
          </p>
        </div>
      )}

      {result && !loading && (
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-2">
            {/* Alerts */}
            {result.alerts && result.alerts.length > 0 && (
              <div className="space-y-2">
                {result.alerts.map((alert, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${severityColor(alert.severity)}`}
                  >
                    {alertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.message}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {alert.severity === "high" ? "Urgente" : alert.severity === "medium" ? "Atenção" : "Info"}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Clinical Analysis */}
            <div className="glass rounded-xl overflow-hidden">
              <button onClick={() => toggleSection("analysis")} className="w-full flex items-center justify-between p-4 hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  <span className="font-display font-semibold">Análise Clínica</span>
                </div>
                {expandedSection === "analysis" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSection === "analysis" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{result.clinicalAnalysis}</p>
                </motion.div>
              )}
            </div>

            {/* Suggested Adjustments */}
            <div className="glass rounded-xl overflow-hidden">
              <button onClick={() => toggleSection("adjustments")} className="w-full flex items-center justify-between p-4 hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-warning" />
                  <span className="font-display font-semibold">Ajustes Sugeridos</span>
                  <Badge variant="secondary" className="text-[10px]">{result.suggestedAdjustments?.length || 0}</Badge>
                </div>
                {expandedSection === "adjustments" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSection === "adjustments" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 pb-4 space-y-2">
                  {result.suggestedAdjustments?.map((adj, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border">
                      <Zap className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                      <p className="text-sm">{adj}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Recommended Protocols */}
            <div className="glass rounded-xl overflow-hidden">
              <button onClick={() => toggleSection("protocols")} className="w-full flex items-center justify-between p-4 hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  <span className="font-display font-semibold">Protocolos Recomendados</span>
                  <Badge variant="secondary" className="text-[10px]">{result.recommendedProtocols?.length || 0}</Badge>
                </div>
                {expandedSection === "protocols" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSection === "protocols" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 pb-4 space-y-2">
                  {result.recommendedProtocols?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">Nenhum protocolo sugerido.</p>
                  )}
                  {result.recommendedProtocols?.map((proto, i) => (
                    <div key={i} className="p-3 rounded-lg bg-card border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-accent" />
                        <span className="text-sm font-semibold">{proto.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{proto.reason}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
