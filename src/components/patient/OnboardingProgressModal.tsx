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
  AlertTriangle, ArrowRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStep {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  route: string;
}

const DISMISSED_KEY = "fitjourney_onboarding_modal_dismissed";

export default function OnboardingProgressModal() {
  const { user, isPatient } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isPatient) return;

    // Don't show if dismissed today
    const dismissedRaw = localStorage.getItem(`${DISMISSED_KEY}_${user.id}`);
    if (dismissedRaw) {
      const dismissed = JSON.parse(dismissedRaw);
      if (dismissed.date === new Date().toISOString().split("T")[0]) return;
    }

    (async () => {
      const { data: pipeline } = await supabase
        .from("onboarding_pipelines")
        .select("*")
        .eq("patient_id", user.id)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!pipeline) return; // No active pipeline or already completed

      setPipelineId(pipeline.id);

      const detectedSteps: PipelineStep[] = [
        {
          key: "anamnesis",
          label: "Anamnese Nutricional",
          description: "Responda o questionário sobre sua saúde e hábitos alimentares.",
          icon: ClipboardCheck,
          completed: !!pipeline.anamnesis_completed,
          route: "/anamnesis",
        },
        {
          key: "body_data",
          label: "Dados Corporais",
          description: "Informe seu peso e altura atuais.",
          icon: Scale,
          completed: !!pipeline.body_data_completed,
          route: "/onboarding",
        },
        {
          key: "preferences",
          label: "Preferências Alimentares",
          description: "Informe suas preferências de refeição, horários e restrições.",
          icon: UtensilsCrossed,
          completed: !!pipeline.preferences_completed,
          route: "/onboarding",
        },
      ];

      const incomplete = detectedSteps.filter((s) => !s.completed);
      if (incomplete.length === 0) return; // All done

      setSteps(detectedSteps);
      setOpen(true);
    })();
  }, [user, isPatient]);

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(
        `${DISMISSED_KEY}_${user.id}`,
        JSON.stringify({ date: new Date().toISOString().split("T")[0] })
      );
    }
    setOpen(false);
  };

  const handleGoToStep = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  // Find first incomplete step
  const firstIncomplete = steps.find((s) => !s.completed);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Etapas Pendentes
          </DialogTitle>
          <DialogDescription>
            Complete as etapas abaixo para que seu plano alimentar personalizado seja gerado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedCount} de {totalCount} concluídas</span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>

          {/* Step list */}
          <div className="space-y-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const isNext = !step.completed && step.key === firstIncomplete?.key;
              return (
                <button
                  key={step.key}
                  onClick={() => !step.completed && handleGoToStep(step.route)}
                  disabled={step.completed}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                    step.completed
                      ? "bg-muted/50 opacity-60"
                      : isNext
                        ? "bg-primary/10 border border-primary/30 hover:bg-primary/20"
                        : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                    step.completed ? "bg-green-500/20 text-green-600" : "bg-primary/20 text-primary"
                  )}>
                    {step.completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      step.completed && "line-through text-muted-foreground"
                    )}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                  </div>
                  {!step.completed && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleDismiss} className="flex-1">
              Lembrar depois
            </Button>
            {firstIncomplete && (
              <Button onClick={() => handleGoToStep(firstIncomplete.route)} className="flex-1 gap-1">
                <Sparkles className="h-4 w-4" />
                Preencher agora
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
