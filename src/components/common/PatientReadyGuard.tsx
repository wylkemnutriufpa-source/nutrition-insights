import { ReactNode, useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useEnsurePatientReady } from "@/hooks/useEnsurePatientReady";
import { Loader2, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePatientJourneyStatus, IS_FLUID_STATE } from "@/hooks/usePatientJourneyStatus";
import OnboardingGateScreen from "@/components/patient/OnboardingGateScreen";

interface Props {
  children: ReactNode;
  /** Nome da tela para logging. Ex: "anamnese", "meal_plan", "checkin", "dashboard". */
  context: string;
  /** Pacientes específicos (uso no profissional). Default: usuário autenticado. */
  patientId?: string | null;
}

export default function PatientReadyGuard({ children, context, patientId }: Props) {
  const { user, isPatient, loading: authLoading } = useAuth();
  const { status: journeyStatus, loading: journeyLoading } = usePatientJourneyStatus();
  const targetId = patientId ?? user?.id ?? null;

  const result = useEnsurePatientReady(targetId, {
    context,
    // Só roda para pacientes autenticados (ou quando o profissional passou um id explícito)
    enabled: !authLoading && !!targetId && (isPatient || !!patientId),
  });

  const [graceDone, setGraceDone] = useState(false);
  const toastedRef = useRef<string | null>(null);

  useEffect(() => {
    if (result.status === "fixed") {
      const key = `${targetId}:${context}`;
      if (toastedRef.current !== key) {
        toastedRef.current = key;
        toast.success("Corrigimos automaticamente um detalhe para você", {
          description: "Seu acesso já está pronto.",
          duration: 3000,
        });
      }
      const t = setTimeout(() => setGraceDone(true), 300);
      return () => clearTimeout(t);
    }
    setGraceDone(false);
  }, [result.status, targetId, context]);

  // Block dashboard/critical screens if not in a fluid state
  // IMPORTANT: This check must stay AFTER all hooks to avoid React rule violations
  const shouldBlockJourney = isPatient && !journeyLoading && journeyStatus && (journeyStatus === "awaiting_payment" || journeyStatus === "awaiting_onboarding_release");

  // Profissional sem patientId explícito: não bloqueia nada
  if (!isPatient && !patientId) return <>{children}</>;

  if (authLoading || result.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Preparando seu acesso...</p>
      </div>
    );
  }

  if (result.status === "fixed" && !graceDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
        <ShieldCheck className="h-10 w-10 text-primary mb-3" />
        <p className="text-sm font-medium text-foreground">
          Corrigindo seu acesso automaticamente...
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Isso leva apenas alguns segundos.
        </p>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Estamos ajustando seu acesso
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mb-5">
          Tente novamente em alguns instantes. Nossa equipe já foi notificada
          automaticamente.
        </p>
        <Button onClick={() => window.location.reload()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (result.status === "no_link" || journeyStatus === "no_link" || (isPatient && !journeyLoading && journeyStatus === null)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-background">
        <div className="rounded-full bg-orange-100 dark:bg-orange-950/30 p-6 mb-6">
          <AlertTriangle className="h-10 w-10 text-orange-600 dark:text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Vínculo não encontrado
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Não conseguimos identificar seu nutricionista. Isso acontece quando sua conta não está corretamente vinculada a um profissional na nossa plataforma.
        </p>
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-lg p-4 mb-8 text-left max-w-sm">
          <p className="text-xs text-orange-800 dark:text-orange-400 font-semibold mb-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Ação recomendada:
          </p>
          <p className="text-xs text-orange-700 dark:text-orange-300">
            Entre em contato com seu nutricionista e solicite um novo link de convite oficial para reativar seu acesso.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="default"
            onClick={() => window.location.href = "mailto:suporte@fitjourney.com.br?subject=Erro de Vinculo - " + (user?.email || "Paciente")} 
            className="gap-2"
          >
            Falar com suporte
          </Button>
          <Button variant="ghost" onClick={() => window.location.href = "/auth"}>
            Voltar ao Login
          </Button>
        </div>
      </div>
    );
  }

  if (shouldBlockJourney && !authLoading && !journeyLoading) {
    return <OnboardingGateScreen status={journeyStatus!} />;
  }

  return <>{children}</>;
}