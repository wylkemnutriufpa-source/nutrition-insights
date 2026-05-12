/**
 * Shows consent status badge for patient profiles (visible to nutritionists).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { Badge } from "@v1/components/ui/badge";
import { Shield, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  patientId: string;
}

export function PatientConsentBadge({ patientId }: Props) {
  const { data: consent } = useQuery({
    queryKey: ["patient-consent-status", patientId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("clinical_consents")
        .select("accepted_at, accepted_terms_version")
        .eq("patient_id", patientId)
        .is("revoked_at", null)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });

  if (!consent) {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <ShieldAlert className="h-3 w-3" />
        Sem consentimento LGPD
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
        <Shield className="h-3 w-3" />
        Consentimento LGPD ativo
      </Badge>
      <span className="text-xs text-muted-foreground">
        v{consent.accepted_terms_version} · {format(new Date(consent.accepted_at), "dd/MM/yyyy", { locale: ptBR })}
      </span>
    </div>
  );
}
