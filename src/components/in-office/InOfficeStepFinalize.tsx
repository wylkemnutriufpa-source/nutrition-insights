import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle2, ArrowLeft, Loader2, ClipboardList, Activity,
  Utensils, FileText, Send, Eye, AlertTriangle
} from "lucide-react";

interface Props {
  patientId: string;
  onPrev: () => void;
  onComplete: () => void;
  sessionId: string;
}

export default function InOfficeStepFinalize({ patientId, onPrev, onComplete, sessionId }: Props) {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [mealPlanId, setMealPlanId] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [sessRes, profRes] = await Promise.all([
          supabase.from("in_office_sessions" as any).select("*").eq("id", sessionId).maybeSingle(),
          supabase.from("profiles").select("full_name").eq("user_id", patientId).maybeSingle(),
        ]);
        
        if (sessRes.error) throw sessRes.error;
        
        const sess = sessRes.data as any;
        setSession(sess);
        setPatientName(profRes.data?.full_name || "Paciente");

        // Check if plan exists and its status
        if (sess?.meal_plan_id) {
          setMealPlanId(sess.meal_plan_id);
          const { data: plan } = await supabase
            .from("meal_plans")
            .select("plan_status")
            .eq("id", sess.meal_plan_id)
            .maybeSingle();
          if (plan) {
            setPlanStatus(plan.plan_status);
            if (plan.plan_status === "published_to_patient" || plan.plan_status === "approved") {
              setPublished(true);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar sessão:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, patientId]);

  const handlePublish = async () => {
    if (!mealPlanId) {
      toast.error("Nenhum plano alimentar criado nesta sessão.");
      return;
    }
    setPublishing(true);
    try {
      const { error } = await supabase
        .from("meal_plans")
        .update({ plan_status: "published_to_patient" })
        .eq("id", mealPlanId)
        .in("plan_status", ["draft", "draft_auto_generated", "draft_auto_corrected", "under_professional_review"]);

      if (error) throw error;

      setPublished(true);
      setPlanStatus("published_to_patient");
      toast.success("🎉 Plano publicado para o paciente!");
    } catch (err: any) {
      toast.error("Erro ao publicar: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const checks = [
    { label: "Anamnese preenchida", done: session?.anamnesis_completed, icon: ClipboardList },
    { label: "Avaliação física registrada", done: session?.assessment_completed, icon: Activity },
    { label: "Plano alimentar criado", done: session?.meal_plan_completed, icon: Utensils },
    { label: "Plano publicado ao paciente", done: published, icon: Send },
  ];

  const allDone = checks.every(c => c.done);
  const canPublish = mealPlanId && !published && planStatus !== "published_to_patient" && planStatus !== "approved";
  const alreadyPublished = planStatus === "published_to_patient" || planStatus === "approved";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-4 h-4 text-primary" />
          Resumo da Sessão — {patientName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {checks.map(c => {
            const Icon = c.icon;
            return (
              <div key={c.label} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${c.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/30"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.done ? "bg-emerald-500/20" : "bg-muted"}`}>
                  {c.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Icon className="w-4 h-4 text-muted-foreground" />}
                </div>
                <span className={`text-sm font-medium ${c.done ? "text-foreground" : "text-muted-foreground"}`}>{c.label}</span>
              </div>
            );
          })}
        </div>

        {/* Publish section */}
        {canPublish && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Publicar plano alimentar</p>
                <p className="text-xs text-muted-foreground">Após publicar, o plano ficará imutável e visível ao paciente.</p>
              </div>
            </div>
            <Button onClick={handlePublish} disabled={publishing} className="gap-2 w-full bg-primary hover:bg-primary/90">
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {publishing ? "Publicando..." : "Publicar Plano"}
            </Button>
          </div>
        )}

        {alreadyPublished && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Plano publicado com sucesso!
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/patients/${patientId}`)}
              className="gap-2"
            >
              <Eye className="w-4 h-4" /> Ver perfil do paciente
            </Button>
          </div>
        )}

        {!mealPlanId && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
            ⚠️ Nenhum plano alimentar foi criado nesta sessão. Volte ao passo 4 para criar um.
          </div>
        )}

        {!allDone && mealPlanId && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
            ⚠️ Algumas etapas não foram concluídas. Você pode voltar e completá-las ou finalizar parcialmente.
          </div>
        )}

        {/* Navigation is handled by parent wizard */}
      </CardContent>
    </Card>
  );
}
