/**
 * FitJourney — Payment Guard
 * Blocks patient access unless they have:
 * 1. A paid booking_payment
 * 2. A paid record in payments table
 * 3. An active prestige plan (Pro/Premium/semestral+)
 * 4. Journey status manually released by nutritionist (awaiting_payment bypass)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface PaymentGuardState {
  hasPaid: boolean;
  loading: boolean;
  reason: "booking" | "payment" | "prestige" | "released" | null;
}

export function usePaymentGuard(): PaymentGuardState {
  const { user, isPatient, profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["payment-guard", user?.id],
    queryFn: async () => {
      if (!user) return { paid: false, reason: null };

      // Check 1: patient_prestige with high-tier plan (display_order >= 3 = Pro/Premium/Biquini)
      const { data: prestige } = await (supabase as any)
        .from("patient_prestige")
        .select("id, plan_id, prestige_plans(display_order, slug)")
        .eq("patient_id", user.id)
        .eq("is_active", true)
        .limit(5);

      const hasHighPrestige = prestige?.some(
        (p: any) => p.prestige_plans && p.prestige_plans.display_order >= 3
      );
      if (hasHighPrestige) return { paid: true, reason: "prestige" };

      // Check 2: payments table (direct payment)
      const { data: directPayments } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["paid", "succeeded"])
        .limit(1);

      if (directPayments && directPayments.length > 0) return { paid: true, reason: "payment" };

      // Check 3: booking_payments by email
      const email = user.email;
      if (email) {
        const { data: bookings } = await supabase
          .from("booking_payments")
          .select("id")
          .eq("customer_email", email.toLowerCase())
          .eq("status", "paid")
          .limit(1);

        if (bookings && bookings.length > 0) return { paid: true, reason: "booking" };
      }

      // Check 4: journey_status already beyond awaiting_payment (manual release by nutritionist)
      const { data: journey } = await (supabase as any)
        .from("nutritionist_patients")
        .select("journey_status")
        .eq("patient_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const releasedStatuses = [
        "awaiting_onboarding_release",
        "onboarding_active",
        "onboarding_completed",
        "clinical_followup_active",
      ];
      if (journey && releasedStatuses.includes(journey.journey_status)) {
        return { paid: true, reason: "released" };
      }

      return { paid: false, reason: null };
    },
    enabled: !!user && isPatient,
    staleTime: 2 * 60 * 1000,
  });

  if (!isPatient) {
    return { hasPaid: true, loading: false, reason: null };
  }

  return {
    hasPaid: data?.paid ?? false,
    loading: isLoading,
    reason: (data?.reason as PaymentGuardState["reason"]) ?? null,
  };
}
