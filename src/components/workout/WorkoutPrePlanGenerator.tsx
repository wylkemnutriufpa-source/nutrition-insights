import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Sparkles, Loader2, Check, AlertTriangle, Dumbbell,
  ArrowRight, Edit3, RefreshCw, Send
} from "lucide-react";
import { generatePrePlanFromAnamnesis, type WorkoutTemplate } from "./workoutTemplateData";

interface WorkoutPrePlanGeneratorProps {
  studentId: string;
  studentName: string;
  onApproveAndPublish: (template: WorkoutTemplate) => void;
  onEditPlan: (template: WorkoutTemplate) => void;
}

export default function WorkoutPrePlanGenerator({
  studentId,
  studentName,
  onApproveAndPublish,
  onEditPlan,
}: WorkoutPrePlanGeneratorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [anamnesisData, setAnamnesisData] = useState<any>(null);
  const [prePlan, setPrePlan] = useState<WorkoutTemplate | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadAnamnesis();
  }, [studentId]);

  const loadAnamnesis = async () => {
    setLoading(true);
    try {
      // Carregar dados da anamnese do personal + anamnese nutricional
      const [trainerRes, nutritionRes, profileRes] = await Promise.all([
        (supabase as any).from("trainer_assessments")
          .select("*")
          .eq("patient_id", studentId)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("patient_anamnesis")
          .select("answers")
          .eq("user_id", studentId)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("profiles")
          .select("full_name, goal")
          .eq("user_id", studentId)
          .maybeSingle(),
      ]);

      const trainerData = (trainerRes.data as any)?.[0]?.assessment_data;
      const nutritionAnswers = (nutritionRes.data as any)?.[0]?.answers;
      const profile = profileRes.data;

      // Consolidar dados
      const consolidated = {
        goal: trainerData?.goals?.primary_goal || nutritionAnswers?.primary_goal || profile?.goal || "",
        level: trainerData?.training_history?.experience_level || nutritionAnswers?.fitness_level || "iniciante",
        sex: trainerData?.synced?.sex || nutritionAnswers?.biological_sex || "",
        daysPerWeek: trainerData?.availability?.days_per_week || 3,
        restrictions: [
          ...(trainerData?.readiness?.conditions || []),
          ...(nutritionAnswers?.food_intolerances || []),
        ],
        painAreas: trainerData?.pain_injury?.pain_areas || [],
        hasAnamnesis: !!(trainerData || nutritionAnswers),
      };

      setAnamnesisData(consolidated);

      // Gerar pré-plano
      if (consolidated.hasAnamnesis) {
        const plan = generatePrePlanFromAnamnesis(consolidated);
        setPrePlan(plan);
      }
    } catch (err) {
      console.error("Erro ao carregar anamnese:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!prePlan || !user) return;
    setPublishing(true);
    try {
      onApproveAndPublish(prePlan);
      toast.success("Pré-plano aprovado! Criando plano de treino...");
    } catch (err) {
      toast.error("Erro ao publicar plano");
    } finally {
      setPublishing(false);
    }
  };

  const handleRegenerate = () => {
    if (!anamnesisData) return;
    const plan = generatePrePlanFromAnamnesis(anamnesisData);
    setPrePlan(plan);
    toast.info("Pré-plano regenerado!");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Analisando anamnese de {studentName}...</p>
        </CardContent>
      </Card>
    );
  }

  if (!anamnesisData?.hasAnamnesis) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
          <p className="font-medium">Anamnese não preenchida</p>
          <p className="text-sm text-muted-foreground mt-1">
            O aluno {studentName} ainda não completou a anamnese. Envie o onboarding primeiro.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!prePlan) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Dumbbell className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="font-medium">Não foi possível gerar pré-plano</p>
          <p className="text-sm text-muted-foreground mt-1">
            Os dados da anamnese não são suficientes para sugerir um template.
          </p>
          <Button variant="outline" className="mt-4" onClick={handleRegenerate}>
            <RefreshCw className="w-4 h-4 mr-1" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const warnings = prePlan.routines.flatMap(r =>
    r.exercises.filter(e => e.notes?.includes("⚠️")).map(e => ({
      routine: r.name,
      exercise: e.name,
      note: e.notes!,
    }))
  );

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Pré-Plano Gerado para {studentName}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Baseado na anamnese
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-background rounded-lg p-2 text-center">
              <p className="text-muted-foreground">Objetivo</p>
              <p className="font-bold capitalize">{anamnesisData.goal || "Geral"}</p>
            </div>
            <div className="bg-background rounded-lg p-2 text-center">
              <p className="text-muted-foreground">Nível</p>
              <p className="font-bold capitalize">{anamnesisData.level}</p>
            </div>
            <div className="bg-background rounded-lg p-2 text-center">
              <p className="text-muted-foreground">Frequência</p>
              <p className="font-bold">{anamnesisData.daysPerWeek}x/semana</p>
            </div>
            <div className="bg-background rounded-lg p-2 text-center">
              <p className="text-muted-foreground">Restrições</p>
              <p className="font-bold">{anamnesisData.painAreas.length} áreas</p>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs font-bold text-amber-600 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Alertas de Segurança
              </p>
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-700">
                  <span className="font-medium">{w.routine}</span> → {w.exercise}: área com dor reportada
                </p>
              ))}
            </div>
          )}

          <div className="border rounded-lg divide-y">
            <div className="p-3 bg-muted/50">
              <h4 className="font-bold text-sm">{prePlan.name}</h4>
              <p className="text-xs text-muted-foreground">{prePlan.description}</p>
            </div>
            {prePlan.routines.map((r, ri) => (
              <motion.div
                key={ri}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: ri * 0.05 }}
                className="p-3"
              >
                <p className="font-semibold text-xs mb-1">{r.name}</p>
                <div className="space-y-0.5">
                  {r.exercises.map((e, ei) => (
                    <p key={ei} className={`text-[11px] ${e.notes?.includes("⚠️") ? "text-amber-600" : "text-muted-foreground"}`}>
                      {e.name} — {e.sets}x{e.reps} ({e.rest_seconds}s)
                      {e.notes && !e.notes.includes("⚠️") && <span className="italic"> • {e.notes}</span>}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleRegenerate} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Regenerar
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEditPlan(prePlan)} className="gap-1">
              <Edit3 className="w-3.5 h-3.5" /> Editar antes de aprovar
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={publishing} className="gap-1 ml-auto">
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Aprovar e Publicar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
