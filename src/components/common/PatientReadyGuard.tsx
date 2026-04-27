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

  // Permite "fixed" passar para "ok" quase instantaneamente
  const [graceDone, setGraceDone] = useState(false);
  const toastedRef = useRef<string | null>(null);

  // Block dashboard/critical screens if not in a fluid state
  const shouldBlock = isPatient && !journeyLoading && journeyStatus && (journeyStatus === "awaiting_payment" || journeyStatus === "awaiting_onboarding_release");

  // Permite "fixed" passar para "ok" quase instantaneamente
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

  return <>{children}</>;
}
