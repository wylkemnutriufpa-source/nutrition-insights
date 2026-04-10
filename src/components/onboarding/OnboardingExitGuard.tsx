/**
 * Modal that warns patients when they try to leave onboarding before completing it.
 * Also hooks into browser beforeunload to catch tab close / back button.
 */
import { useEffect, useCallback, useState } from "react";
import { useBlocker } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, ClipboardCheck } from "lucide-react";

interface OnboardingExitGuardProps {
  /** Whether the guard should be active (incomplete onboarding) */
  enabled: boolean;
  /** Whether user has started filling (to distinguish first access vs returning) */
  hasStartedFilling?: boolean;
}

export default function OnboardingExitGuard({
  enabled,
  hasStartedFilling = false,
}: OnboardingExitGuardProps) {
  // Browser close / tab close / refresh guard
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages but still show a prompt
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);

  // In-app navigation guard (react-router)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      enabled && currentLocation.pathname !== nextLocation.pathname
  );

  const handleStay = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

  const handleLeave = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  }, [blocker]);

  return (
    <AlertDialog open={blocker.state === "blocked"} onOpenChange={(open) => { if (!open) handleStay(); }}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mb-2">
            <AlertTriangle className="h-7 w-7 text-warning" />
          </div>
          <AlertDialogTitle className="text-center text-lg">
            Você está saindo do onboarding
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            <p>
              O preenchimento do onboarding é <strong className="text-foreground">essencial</strong> para
              que seu nutricionista possa elaborar sua dieta personalizada.
            </p>
            {!hasStartedFilling ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-left">
                <ClipboardCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary/80">
                  Este é seu primeiro acesso. Sem preencher o onboarding,
                  <strong> não será possível gerar seu plano alimentar</strong>.
                  Leva apenas alguns minutos!
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border text-left">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Seu progresso foi salvo! Quando voltar, você continuará
                  de onde parou. Mas quanto antes concluir, mais rápido
                  receberá sua dieta.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogAction
            onClick={handleStay}
            className="w-full sm:w-auto"
          >
            Continuar preenchendo
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={handleLeave}
            className="w-full sm:w-auto text-muted-foreground"
          >
            Sair mesmo assim
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
