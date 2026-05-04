import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();
  const targetId = patientId ?? user?.id ?? null;

  const result = useEnsurePatientReady(targetId, {
    context,
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

  // EMERGENCY BYPASS: Access always allowed in incident mode
  return <>{children}</>;
}
