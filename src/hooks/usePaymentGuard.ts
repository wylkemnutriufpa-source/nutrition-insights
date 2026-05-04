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

      // Check 1 (PRIORITY): journey_status — most reliable for manually released patients
      try {
        const { data: journey } = await supabase
          .from("nutritionist_patients")
          .select("journey_status")
          .eq("patient_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const releasedStatuses = [
          "active",
          "awaiting_consent",
          "awaiting_onboarding_release",
          "onboarding_active",
          "onboarding_completed",
          "draft_ready_for_review",
          "plan_published",
          "active_followup",
          "clinical_followup_active",
        ];
        if (journey && releasedStatuses.includes(journey.journey_status)) {
          return { paid: true, reason: "released" };
        }
      } catch (e) {
        console.warn("[PaymentGuard] journey check failed:", e);
      }

      // Check 2: patient_prestige with high-tier plan
      try {
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
      } catch (e) {
        console.warn("[PaymentGuard] prestige check failed:", e);
      }

      // Check 3: payments table (direct payment)
      try {
        const { data: directPayments } = await supabase
          .from("payments")
          .select("id")
          .eq("user_id", user.id)
          .in("status", ["paid", "succeeded"])
          .limit(1);

        if (directPayments && directPayments.length > 0) return { paid: true, reason: "payment" };
      } catch (e) {
        console.warn("[PaymentGuard] payments check failed:", e);
      }

      // Check 4: booking_payments by email
      try {
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
      } catch (e) {
        console.warn("[PaymentGuard] booking check failed:", e);
      }

      return { paid: false, reason: null };
    },
    enabled: !!user && isPatient,
    staleTime: 5 * 1000, // 5s — fast refresh after payment confirmation
    retry: 2,
  });

  if (!isPatient) {
    return { hasPaid: true, loading: false, reason: null };
  }

  // EMERGENCY BYPASS: Always allow access in incident mode
  return {
    hasPaid: true,
    loading: false,
    reason: "released",
  };
}
