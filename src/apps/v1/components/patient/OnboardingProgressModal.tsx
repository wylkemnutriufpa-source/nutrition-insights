import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardCheck, Scale, UtensilsCrossed, CheckCircle2,
  ArrowRight, Sparkles, Clock, PartyPopper, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatientPlanStatus } from "@/hooks/usePatientPlanStatus";
import { resolvePatientIdentity } from "@/lib/onboardingPlanResolver";

interface PipelineStep {
  key: string;
  label: string;
  description: string;
  helpText: string;
  icon: React.ElementType;
  completed: boolean;
  route: string;
}

const DISMISSED_KEY = "fitjourney_onboarding_modal_dismissed";

export default function OnboardingProgressModal() {
  const { user, isPatient } = useAuth();
  const navigate = useNavigate();
  const planStatus = usePatientPlanStatus();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isPatient) return;
    if (planStatus.isLoading) return;
    if (!planStatus.showOnboarding) return;

    // Don't show if dismissed in the last 4 hours
    const dismissedRaw = localStorage.getItem(`${DISMISSED_KEY}_${user.id}`);
    if (dismissedRaw) {
      const dismissed = JSON.parse(dismissedRaw);
      const dismissedTime = new Date(dismissed.timestamp || dismissed.date).getTime();
      if (Date.now() - dismissedTime < 4 * 60 * 60 * 1000) return;
    }

    (async () => {
      const patientIdentity = await resolvePatientIdentity(user.id);
      const { data: pipeline } = await supabase
        .from("onboarding_pipelines")
        .select("*")
        .in("patient_id", patientIdentity.allIds)
        .not("status", "in", '("completed","superseded_by_published_plan")')
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!pipeline) return;

      // Block onboarding if not released by professional
      const releaseStatus = (pipeline as any).release_status;
      if (releaseStatus !== "released") return;

      setPipelineId(pipeline.id);

      // Read progressive step state
      const stepState = (pipeline as any).onboarding_step_completed || {};

      const allPatientStepsDone = !!pipeline.anamnesis_completed && !!pipeline.body_data_completed && !!pipeline.preferences_completed;

      const detectedSteps: PipelineStep[] = [
        {
          key: "anamnesis",
          label: "Anamnese Nutricional",
          description: pipeline.anamnesis_completed
            ? "✅ Questionário inicial preenchido. Ainda faltam as próximas etapas do onboarding."
            : "Responda o questionário sobre sua saúde e hábitos alimentares.",
          helpText: "A anamnese é só a primeira parte. O onboarding só termina após dados corporais, preferências e andamento do plano.",
          icon: ClipboardCheck,
          completed: !!pipeline.anamnesis_completed,
          route: "/onboarding",
        },
        {
          key: "body_data",
          label: "Dados Corporais",
          description: pipeline.body_data_completed
            ? "✅ Dados corporais registrados!"
            : "Informe seu peso e altura atuais.",
          helpText: "Precisamos do seu peso e altura para calcular suas necessidades calóricas. Leva menos de 1 minuto.",
          icon: Scale,
          completed: !!pipeline.body_data_completed,
          route: "/onboarding",
        },
        {
          key: "preferences",
          label: "Preferências Alimentares",
          description: pipeline.preferences_completed
            ? "✅ Preferências salvas!"
            : "Informe suas preferências de refeição, horários e restrições.",
          helpText: "Conte ao seu nutricionista sobre alergias, alimentos que não gosta e horários de refeição. Leva cerca de 2 minutos.",
          icon: UtensilsCrossed,
          completed: !!pipeline.preferences_completed,
          route: "/onboarding",
        },
        {
          key: "approval",
          label: "Geração do Plano",
          description: allPatientStepsDone
            ? "🎉 Todas as etapas concluídas! Seu nutricionista está preparando seu plano."
            : "Após preencher tudo acima, seu nutricionista criará seu plano personalizado.",
          helpText: allPatientStepsDone
            ? "Seu profissional foi notificado. O plano será entregue em breve!"
            : "Complete as etapas acima para que seu nutricionista possa iniciar a elaboração do seu plano.",
          icon: allPatientStepsDone ? PartyPopper : CheckCircle2,
          completed: !!pipeline.plan_approved,
          route: "/client/dashboard",
        },
      ];

      const incomplete = detectedSteps.filter((s) => !s.completed);
      if (incomplete.length === 0) return;

      setSteps(detectedSteps);
      setOpen(true);
    })();
  }, [user, isPatient, planStatus.isLoading, planStatus.showOnboarding]);

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(
        `${DISMISSED_KEY}_${user.id}`,
        JSON.stringify({ timestamp: new Date().toISOString() })
      );
    }
    setOpen(false);
  };

  const handleGoToStep = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  const firstIncomplete = steps.find((s) => !s.completed && s.key !== "approval");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Bem-vindo(a) ao FitJourney! 🎯
          </DialogTitle>
          <DialogDescription className="text-sm">
            Para receber seu plano alimentar personalizado, complete as etapas abaixo. 
            <span className="font-medium text-foreground"> É rápido e fácil!</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="font-medium">{completedCount} de {totalCount} concluídas</span>
              <span className="font-bold text-primary">{percent}%</span>
            </div>
            <Progress value={percent} className="h-2.5" />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isNext = !step.completed && step.key === firstIncomplete?.key;
              return (
                <button
                  key={step.key}
                  onClick={() => {
                    if (!step.completed && step.key !== "approval") handleGoToStep(step.route);
                  }}
                  disabled={step.completed || step.key === "approval"}
                  className={cn(
                    "w-full flex items-start gap-3 p-3.5 rounded-xl text-left transition-all duration-200",
                    step.completed
                      ? "bg-accent/30 border border-accent/50"
                      : step.key === "approval"
                        ? "bg-muted/30 border border-dashed border-muted-foreground/20"
                        : isNext
                          ? "bg-primary/10 border-2 border-primary/40 hover:bg-primary/15 shadow-sm"
                          : "bg-muted/20 border border-muted-foreground/10 hover:bg-muted/40"
                  )}
                >
                  {/* Step number / check */}
                  <div className={cn(
                    "flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold",
                    step.completed
                      ? "bg-accent text-accent-foreground"
                      : step.key === "approval"
                        ? "bg-muted text-muted-foreground"
                        : isNext
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                  )}>
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : step.key === "approval" ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-semibold",
                      step.completed && "text-accent-foreground"
                    )}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    {/* Help text for the next step */}
                    {isNext && (
                      <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                        <Info className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-primary/80">{step.helpText}</p>
                      </div>
                    )}
                  </div>

                  {!step.completed && step.key !== "approval" && (
                    <ArrowRight className={cn(
                      "h-4 w-4 flex-shrink-0 mt-1",
                      isNext ? "text-primary" : "text-muted-foreground"
                    )} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="flex-1 text-muted-foreground">
              Lembrar depois
            </Button>
            {firstIncomplete && (
              <Button onClick={() => handleGoToStep(firstIncomplete.route)} className="flex-1 gap-1.5 font-semibold">
                <Sparkles className="h-4 w-4" />
                {firstIncomplete.key === "anamnesis" ? "Continuar onboarding" :
                 firstIncomplete.key === "body_data" ? "Informar dados" :
                 "Preencher agora"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
