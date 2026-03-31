import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck, Scale, UtensilsCrossed, CheckCircle2,
  ArrowRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatientPlanStatus } from "@/hooks/usePatientPlanStatus";

interface Step {
  key: string;
  label: string;
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
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (!user || !isPatient) return;
    if (planStatus.isLoading) return;
    if (!planStatus.showOnboarding) return;

    const dismissedRaw = localStorage.getItem(`${DISMISSED_KEY}_${user.id}`);
    if (dismissedRaw) {
      const dismissed = JSON.parse(dismissedRaw);
      const dismissedTime = new Date(dismissed.timestamp || dismissed.date).getTime();
      if (Date.now() - dismissedTime < 4 * 60 * 60 * 1000) return;
    }

    (async () => {
      const { data: pipeline } = await supabase
        .from("onboarding_pipelines")
        .select("*")
        .eq("patient_id", user.id)
        .not("status", "in", '("completed","superseded_by_published_plan")')
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!pipeline) return;

      const releaseStatus = (pipeline as any).release_status;
      if (releaseStatus !== "released") return;

      const detectedSteps: Step[] = [
        {
          key: "anamnesis",
          label: "Questionário de saúde",
          icon: ClipboardCheck,
          completed: !!pipeline.anamnesis_completed,
          route: "/anamnesis",
        },
        {
          key: "body_data",
          label: "Peso e altura",
          icon: Scale,
          completed: !!pipeline.body_data_completed,
          route: "/onboarding",
        },
        {
          key: "preferences",
          label: "Preferências alimentares",
          icon: UtensilsCrossed,
          completed: !!pipeline.preferences_completed,
          route: "/onboarding",
        },
      ];

      const incomplete = detectedSteps.filter((s) => !s.completed);
      if (incomplete.length === 0) return;

      setSteps(detectedSteps);
      setOpen(true);
    })();
  }, [user, isPatient, planStatus.isLoading, planStatus.showOnboarding]);

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(
        `${DISMISSED_KEY}_${user.id}`,
        JSON.stringify({ timestamp: new Date().toISOString() })
      );
    }
    setOpen(false);
  };

  const handleGo = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  const completedCount = steps.filter((s) => s.completed).length;
  const firstIncomplete = steps.find((s) => !s.completed);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-sm p-6">
        <div className="text-center space-y-4">
          <span className="text-4xl block">🎯</span>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Complete seu perfil
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {completedCount}/{steps.length} etapas concluídas
            </p>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          {steps.map((step) => {
            const Icon = step.icon;
            const isNext = step.key === firstIncomplete?.key;
            return (
              <button
                key={step.key}
                onClick={() => !step.completed && handleGo(step.route)}
                disabled={step.completed}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                  step.completed
                    ? "bg-accent/30"
                    : isNext
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/20"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  step.completed
                    ? "bg-accent text-accent-foreground"
                    : isNext
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}>
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium flex-1",
                  step.completed && "line-through text-muted-foreground"
                )}>
                  {step.label}
                </span>
                {isNext && <ArrowRight className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="flex-1 text-muted-foreground text-xs">
            Depois
          </Button>
          {firstIncomplete && (
            <Button onClick={() => handleGo(firstIncomplete.route)} size="sm" className="flex-1 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Começar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
