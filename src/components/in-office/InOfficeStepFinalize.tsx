import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle2, ArrowLeft, Loader2, ClipboardList, Activity,
  Utensils, FileText, Send, Eye, AlertTriangle, Sparkles, Wand2, BookOpen,
  RefreshCw, XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";


import { publishMealPlan } from "@/lib/serverTransitions";
import { useAuth } from "@/hooks/use-auth";

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
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [mealPlanId, setMealPlanId] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [hasStory, setHasStory] = useState(false);

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
        // Check for stories
        const { data: story } = await supabase
          .from("patient_journey_stories")
          .select("id")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (story) setHasStory(true);
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
    setPublishError(null);
    setPublishProgress(0);
    
    try {
      // Step 1: Prepare
      await new Promise(r => setTimeout(r, 400));
      setPublishProgress(25);

      // Step 2: Optimizing
      await new Promise(r => setTimeout(r, 400));
      setPublishProgress(50);

      // Step 3: Finalizing
      await new Promise(r => setTimeout(r, 400));
      setPublishProgress(75);

      // Actual Supabase update
      const { error } = await supabase
        .from("meal_plans")
        .update({ 
          plan_status: "published_to_patient",
          is_active: true 
        })
        .eq("id", mealPlanId)
        .in("plan_status", ["draft", "draft_auto_generated", "draft_auto_corrected", "under_professional_review"]);

      if (error) throw error;

      setPublishProgress(100);
      await new Promise(r => setTimeout(r, 400));

      setPublished(true);
      setPlanStatus("published_to_patient");
      toast.success("🎉 Plano publicado para o paciente!");
    } catch (err: any) {
      setPublishError(err.message || "Falha na comunicação com o servidor.");
      toast.error("Erro ao publicar: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  
  const handleGenerateStory = async () => {
    setGeneratingStory(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-patient-story", {
        body: { patientId }
      });
      if (error) throw error;
      setHasStory(true);
      toast.success("✨ Jornada mágica gerada para o paciente!");
    } catch (err: any) {
      toast.error("Erro ao gerar jornada: " + err.message);
    } finally {
      setGeneratingStory(false);
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
    <div className="space-y-6">
      <AnimatePresence>
        {(publishing || publishError) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-6"
            data-testid="publish-progress-overlay"
          >
            <Card className="w-full max-w-md shadow-2xl border-primary/20">
              <CardContent className="pt-10 pb-8 px-8 flex flex-col items-center text-center space-y-6">
                {publishing ? (
                  <>
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <Send className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold">Enviando plano...</h3>
                      <p className="text-sm text-muted-foreground mt-1">Otimizando e publicando o plano para o paciente.</p>
                    </div>
                    <div className="w-full space-y-2">
                      <Progress value={publishProgress} className="h-2" data-testid="publish-progress-bar" />
                      <p className="text-[10px] text-muted-foreground font-mono" data-testid="publish-progress-text">{publishProgress}% concluído</p>
                    </div>
                  </>
                ) : publishError ? (
                  <>
                    <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                      <XCircle className="w-10 h-10 text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold">Falha no envio</h3>
                      <p className="text-sm text-destructive mt-1 font-medium" data-testid="publish-error-message">{publishError}</p>
                      <p className="text-xs text-muted-foreground mt-2">Houve um problema ao salvar no banco de dados. Seus dados não foram perdidos.</p>
                    </div>
                    <div className="flex gap-3 w-full">
                      <Button variant="outline" className="flex-1" onClick={() => setPublishError(null)} data-testid="cancel-error-button">
                        Cancelar
                      </Button>
                      <Button className="flex-1 gap-2 bg-primary" onClick={handlePublish} data-testid="retry-publish-button">
                        <RefreshCw className="w-4 h-4" /> Tentar novamente
                      </Button>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border-none shadow-none sm:border sm:shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-primary" />
            Resumo da Sessão — {patientName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {checks.map(c => {
              const Icon = c.icon;
              return (
                <div key={c.label} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${c.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/30"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${c.done ? "bg-emerald-500/20" : "bg-muted"}`}>
                    {c.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Icon className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <span className={`text-xs sm:text-sm font-medium ${c.done ? "text-foreground" : "text-muted-foreground"}`}>{c.label}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Section */}
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Inteligência Narrativa</p>
                    <p className="text-xs text-muted-foreground">Crie uma história personalizada sobre a jornada do paciente.</p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleGenerateStory} 
                disabled={generatingStory || hasStory} 
                size="sm"
                className={`gap-2 w-full transition-all min-h-[44px] sm:min-h-[auto] ${hasStory ? "bg-indigo-500/20 text-indigo-600 hover:bg-indigo-500/30" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 shadow-lg text-white"}`}
                variant={hasStory ? "outline" : "default"}
              >
                {generatingStory ? <Loader2 className="w-4 h-4 animate-spin" /> : hasStory ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {generatingStory ? "Tecendo narrativa..." : hasStory ? "Jornada Gerada!" : "Gerar Jornada Mágica"}
              </Button>
            </div>

            {/* Publish section */}
            <div className="flex flex-col gap-4">
              {canPublish && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Publicar plano alimentar</p>
                      <p className="text-xs text-muted-foreground">O plano ficará visível ao paciente no aplicativo.</p>
                    </div>
                  </div>
                    <Button 
                      onClick={handlePublish} 
                      disabled={publishing} 
                      className="gap-2 w-full bg-primary hover:bg-primary/90 min-h-[48px]"
                      data-testid="publish-button"
                    >
                      {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {publishing ? "Publicando..." : "Salvar e Enviar ao Paciente"}
                    </Button>
                </div>
              )}

              {alreadyPublished && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Plano Ativo e Enviado!
                  </p>
                  <p className="text-xs text-muted-foreground">O paciente recebeu uma notificação e o plano já está disponível para consulta.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/patients/${patientId}`)}
                      className="gap-2 w-full mt-2"
                      data-testid="view-patient-profile-button"
                    >
                      <Eye className="w-4 h-4" /> Ver perfil do paciente
                    </Button>
                </div>
              )}
            </div>
          </div>

          {!mealPlanId && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Nenhum plano alimentar foi criado nesta sessão. Volte ao passo 4 para criar um.</span>
            </div>
          )}

          {!allDone && mealPlanId && !published && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Algumas etapas não foram concluídas. Você pode finalizar mesmo assim.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

