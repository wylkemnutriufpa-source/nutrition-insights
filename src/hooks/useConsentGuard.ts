/**
 * FitJourney — LGPD Consent Guard
 * Checks if the current patient has active clinical consent.
 * Returns consent status and loading state.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const TERMS_VERSION = import.meta.env.VITE_TERMS_VERSION || "1.0.0";

export interface ConsentState {
  hasConsent: boolean;
  loading: boolean;
  consentDate: string | null;
  consentVersion: string | null;
}

export function useConsentGuard(): ConsentState {
  const { user, isPatient } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["clinical-consent", user?.id, TERMS_VERSION],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("clinical_consents")
        .select("id, accepted_at, accepted_terms_version")
        .eq("patient_id", user.id)
        .eq("accepted_terms_version", TERMS_VERSION)
        .is("revoked_at", null)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && isPatient,
    staleTime: 5 * 60 * 1000,
  });

  if (!isPatient) {
    return { hasConsent: true, loading: false, consentDate: null, consentVersion: null };
  }

  return {
    hasConsent: !!data?.id,
    loading: isLoading,
    consentDate: data?.accepted_at ?? null,
    consentVersion: data?.accepted_terms_version ?? null,
  };
}

export { TERMS_VERSION };
